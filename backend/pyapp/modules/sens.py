import copy
import logging
import os

import numpy as np
from joblib import Parallel, delayed
from pyscnomics.api.adapter import (
    get_costrecovery,
    get_grosssplit,
    get_transition,
)
from pyscnomics.optimize.sensitivity import (
    get_multipliers_sensitivity,
)

log = logging.getLogger("uvicorn")


class ProcessSens:
    target = ["npv", "irr", "pi", "pot", "gov_take", "ctr_net_share"]

    def __init__(self, type, contract, params, min, max):
        self.type = type
        self.baseContract = contract
        self.parameter = params
        self.min_deviation = min
        self.max_deviation = max
        self.multipliers, total_run = get_multipliers_sensitivity(
            min_deviation=min,
            max_deviation=max,
            number_of_params=len(params),
        )

    def Adjust_Data(self, par: str, multipliers: float):
        Adj_Contract = copy.deepcopy(self.baseContract)
        if multipliers == 1.0:
            return Adj_Contract

        def Adj_Partial_Data(contract_: dict, key: str, datakeys: list = []):
            for item_key in contract_[key].keys():
                item = contract_[key][item_key]
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
                            np.array(list(item[lifting_key]), dtype="float")
                            * multipliers
                        ).tolist()
                else:
                    for data_key in datakeys:
                        item[data_key] = (
                            np.array(list(item[data_key]), dtype="float") * multipliers
                        ).tolist()

        for l in range(2 if self.type >= 3 else 1):
            contract_ = (
                Adj_Contract if self.type < 3 else Adj_Contract[f"contract_{l+1}"]
            )
            if par == "Oil Price" or par == "Gas Price" or par == "Lifting":
                Adj_Partial_Data(contract_, "lifting")
            elif par == "OPEX":
                Adj_Partial_Data(contract_, "opex", ["fixed_cost", "cost_per_volume"])
            elif par == "CAPEX":
                Adj_Partial_Data(contract_, "tangible", ["cost"])
                Adj_Partial_Data(contract_, "intangible", ["cost"])

        return Adj_Contract

    def calcContract(self, i: int, par: str, j: int):
        # log.info([par, np.prod(self.multipliers[i, j, :]), self.multipliers[i, j, :]])
        dataAdj = self.Adjust_Data(par, np.prod(self.multipliers[i, j, :]))
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
            "i": i,
            "par": par,
            "j": j,
            "result": [
                np.prod(self.multipliers[i, j, :]),
                csummary["ctr_npv"],
                csummary["ctr_irr"],
                csummary["ctr_pi"],
                csummary["ctr_pot"],
                csummary["gov_take"],
                csummary["ctr_net_share"],
            ],
        }

    def Run(self):
        cpuCount = os.cpu_count()
        # Create a container for calculation results
        results = {
            par: np.zeros(
                [self.multipliers.shape[1], len(self.target) + 1], dtype=np.float_
            ).tolist()
            for (i, par) in enumerate(self.parameter)
        }
        parallel = Parallel(
            return_as="generator_unordered",
        )
        output_generator = parallel(
            delayed(self.calcContract)(i, par, j)
            for i, par in enumerate(self.parameter)
            for j in range(self.multipliers.shape[1])
        )

        for res in list(output_generator):
            results[res["par"]][res["j"]] = res["result"]
        
        del output_generator

        return results
