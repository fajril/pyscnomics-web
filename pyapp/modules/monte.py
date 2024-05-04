import asyncio
import copy
import json
import logging
import threading

import numpy as np
from joblib import Parallel, delayed

from pyscnomics.api.adapter import (
    get_costrecovery,
    get_grosssplit,
    get_transition,
)
from pyscnomics.optimize.uncertainty import (
    get_multipliers_montecarlo,
)

from .wsconnection import wsMan

log = logging.getLogger("uvicorn")


class ProcessMonte:
    target = ["npv", "irr", "pi", "pot", "gov_take", "ctr_net_share"]

    def __init__(self, type, id, contract, numSim, params):
        self.type = type
        self.id = id
        self.numSim = numSim
        self.progress = 0
        self.baseContract = contract
        self.parameter = params

    def Adjust_Data(self, multipliers: np.ndarray):
        Adj_Contract = copy.deepcopy(self.baseContract)

        def Adj_Partial_Data(
            par: str, key: str, multiplier: float, datakeys: list = []
        ):
            for item_key in Adj_Contract[key].keys():
                item = Adj_Contract[key][item_key]
                if key == "lifting":
                    if (
                        (par == "Oil Price" and item["fluid_type"] == "Oil")
                        or (par == "Gas Price" and item["fluid_type"] == "Gas")
                        or par == "Lifting"
                    ):
                        lifting_key = (
                            "price"
                            if par == "Oil Price" or par == "Gas Price"
                            else "lifting_rate"
                        )
                        item[lifting_key] = (
                            np.array(item[lifting_key]) * multiplier
                        ).tolist()
                else:
                    for data_key in datakeys:
                        item[data_key] = (
                            np.array(item[data_key]) * multiplier
                        ).tolist()

        for i in range(len(self.parameter)):
            # OIl
            if self.parameter[i]["id"] == 0:
                Adj_Partial_Data("Oil Price", "lifting", multipliers[i])
            elif self.parameter[i]["id"] == 1:
                Adj_Partial_Data("Gas Price", "lifting", multipliers[i])
            elif self.parameter[i]["id"] == 2:
                Adj_Partial_Data(
                    "OPEX", "opex", multipliers[i], ["fixed_cost", "cost_per_volume"]
                )
            elif self.parameter[i]["id"] == 3:
                Adj_Partial_Data("CAPEX", "tangible", multipliers[i], ["cost"])
                Adj_Partial_Data("CAPEX", "intangible", multipliers[i], ["cost"])
            elif self.parameter[i]["id"] == 4:
                Adj_Partial_Data("Lifting", "lifting", multipliers[i])
        return Adj_Contract

    def calcContract(self, n: int, multipiers: np.ndarray):

        if self.progress != round(((n + 1) / self.numSim) * 100, 1):
            self.progress = round(((n + 1) / self.numSim) * 100, 1)
            asyncio.run(
                wsMan.broadcast(
                    json.dumps(
                        {
                            "module": "monte",
                            "id": self.id,
                            "data": {"progress": self.progress},
                        }
                    )
                )
            )
        dataAdj = self.Adjust_Data(multipiers)
        csummary = (
            get_costrecovery(data=dataAdj)[0]
            if self.type == 1
            else (
                get_grosssplit(data=dataAdj)[0]
                if self.type == 2
                else get_transition(data=dataAdj)[0] if self.type >= 3 else []
            )
        )
        return {
            "n": n,
            "output": (
                csummary["ctr_npv"],
                csummary["ctr_irr"],
                csummary["ctr_pi"],
                csummary["ctr_pot"],
                csummary["gov_take"],
                csummary["ctr_net_share"],
            ),
        }

    def calculate(self):
        self.progress = 0
        asyncio.run(
            wsMan.broadcast(
                json.dumps(
                    {
                        "module": "monte",
                        "id": self.id,
                        "data": {"progress": self.progress},
                    }
                )
            )
        )
        # Get multipliers
        multipliers = np.ones([self.numSim, len(self.parameter)], dtype=np.float_)

        for i in range(len(self.parameter)):
            multipliers[:, i] = get_multipliers_montecarlo(
                run_number=self.numSim,
                distribution=(
                    "Uniform"
                    if self.parameter[i]["dist"] == 0
                    else "Triangular" if self.parameter[i]["dist"] == 1 else "Normal"
                ),
                min_value=self.parameter[i]["min"],
                mean_value=self.parameter[i]["base"],
                max_value=self.parameter[i]["max"],
                std_dev=self.parameter[i]["stddev"],
            )

        parallel = Parallel(
            return_as="generator",
        )
        output_generator = parallel(
            delayed(self.calcContract)(n, multipliers[n, :]) for n in range(self.numSim)
        )

        # Execute MonteCarlo simulation
        results = np.zeros(
            [self.numSim, len(self.target) + len(self.parameter)], dtype=np.float_
        )

        for res in output_generator:
            results[res["n"], 0 : len(self.target)] = res["output"]
            results[res["n"], len(self.target) :] = [
                multipliers[res["n"], index] * item["base"]
                for index, item in enumerate(self.parameter)
            ]

        # Sorted the results
        results_sorted = np.take_along_axis(
            arr=results,
            indices=np.argsort(results, axis=0),
            axis=0,
        )
        # Specify probability
        prob = np.arange(1, self.numSim + 1, dtype=np.float_) / self.numSim

        # Arrange the results
        results_arranged = np.concatenate((prob[:, np.newaxis], results_sorted), axis=1)

        # Calculate P10, P50, P90
        percentiles = np.percentile(
            a=results_arranged,
            q=[10, 50, 90],
            method="lower",
            axis=0,
        )

        # Determine indices of data to be captured to Excel
        indices = np.linspace(0, self.numSim, 101)[0:-1].astype(int)

        # Final outcomes to be captured to Excel
        outcomes = {
            "results": results_arranged[indices, :].tolist(),
            "P10": percentiles[0, :].tolist(),
            "P50": percentiles[1, :].tolist(),
            "P90": percentiles[2, :].tolist(),
        }

        asyncio.run(
            wsMan.broadcast(
                json.dumps(
                    {
                        "module": "monte",
                        "id": self.id,
                        "data": {"progress": -1, "output": outcomes},
                    }
                )
            )
        )

    def run(self):
        t1 = threading.Thread(target=self.calculate)
        t1.start()

        return True
