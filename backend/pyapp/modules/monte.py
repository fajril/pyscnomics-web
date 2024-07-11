import asyncio
import copy
import hashlib
import json
import logging
import multiprocessing
import os as os
import pickle
import struct
import threading
import time
from pathlib import Path

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

from .basePath import baseAppPath
from .wsconnection import wsMan

log = logging.getLogger("uvicorn")

class ProcessMonte:
    target = ["npv", "irr", "pi", "pot", "gov_take", "ctr_net_share"]

    def __init__(self, type, ws, id, contract, numSim, params):
        self.type = type
        self.ws = ws
        self.id = id
        self.numSim = numSim
        self.progress = 0
        self.baseContract = contract
        self.parameter = params
        self.hasGas = False
        for i in range(len(self.parameter)):
            if self.parameter[i]["id"] == 1:
                self.hasGas = True
                break
        self.hash = hashlib.md5(
            json.dumps(contract, separators=(",", ":")).encode()
        ).hexdigest()

    def Adjust_Data(self, multipliers: np.ndarray):
        Adj_Contract = copy.deepcopy(self.baseContract)

        def Adj_Partial_Data(
            contract_: dict, par: str, key: str, multiplier: float, datakeys: list = []
        ):
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
                            np.array(item[lifting_key]) * multiplier
                        ).tolist()
                else:
                    for data_key in datakeys:
                        item[data_key] = (
                            np.array(item[data_key]) * multiplier
                        ).tolist()

        for l in range(2 if self.type >= 3 else 1):
            contract_ = (
                Adj_Contract if self.type < 3 else Adj_Contract[f"contract_{l+1}"]
            )
            for i in range(len(self.parameter)):
                # OIl
                if self.parameter[i]["id"] == 0:
                    Adj_Partial_Data(contract_, "Oil Price", "lifting", multipliers[i])
                elif self.parameter[i]["id"] == 1:
                    Adj_Partial_Data(contract_, "Gas Price", "lifting", multipliers[i])
                elif self.parameter[i]["id"] == 2:
                    Adj_Partial_Data(
                        contract_,
                        "OPEX",
                        "opex",
                        multipliers[i],
                        ["fixed_cost", "cost_per_volume"],
                    )
                elif self.parameter[i]["id"] == 3:
                    Adj_Partial_Data(
                        contract_, "CAPEX", "tangible", multipliers[i], ["cost"]
                    )
                    Adj_Partial_Data(
                        contract_, "CAPEX", "intangible", multipliers[i], ["cost"]
                    )
                elif self.parameter[i]["id"] == 4:
                    Adj_Partial_Data(contract_, "Lifting", "lifting", multipliers[i])

        return Adj_Contract
    
    def calcContract(self, n: int, multipiers: np.ndarray):
        try:
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
          del dataAdj
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
        except Exception as err:
          print(['Error:', err])
          return {
              "n": n,
              "output": (
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
              ),
          }
          

    def calculate(self):
        # Get multipliers
        multipliers = np.ones([self.numSim, len(self.parameter)], dtype=np.float64)

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

        # Execute MonteCarlo simulation
        def run():
          parallel = Parallel(
              n_jobs=-1, 
              return_as="generator_unordered",
          )
          return parallel(delayed(self.calcContract)(n, multipliers[n, :]) for n in range(self.numSim))
        
        output_generator = run()

        results = np.zeros(
            [self.numSim, len(self.target) + len(self.parameter)], dtype=np.float64
        )

        for res in output_generator:
            results[res["n"], 0 : len(self.target)] = res["output"]
            results[res["n"], len(self.target) :] = [
                multipliers[res["n"], index] * item["base"]
                for index, item in enumerate(self.parameter)
            ]
            
        del output_generator

        # Sorted the results
        results_sorted = np.take_along_axis(
            arr=results,
            indices=np.argsort(results, axis=0),
            axis=0,
        )
        # Specify probability
        prob = np.arange(1, self.numSim + 1, dtype=np.float64) / self.numSim

        # Arrange the results
        results_arranged = np.concatenate((prob[:, np.newaxis], results_sorted), axis=1)

        # Calculate P10, P50, P90
        percentiles = np.percentile(
            a=results_arranged,
            q=[10, 50, 90],
            method="higher",
            axis=0,
        )

        # Determine indices of data
        indices = np.linspace(0, self.numSim, 101)[0:-1].astype(int)
        indices[0] = 1
        if indices[-1] != self.numSim-1:
           indices= np.append(indices, int(self.numSim-1))

        # Final outcomes
        outcomes = {
            "params": (
                ["Oil Price", "Gas Price", "Opex", "Capex", "Cum. prod."]
                if self.hasGas
                else ["Oil Price", "Opex", "Capex", "Cum. prod."]
            ),
            "results": results_arranged[indices, :].tolist(),
            "P10": percentiles[0, :].tolist(),
            "P50": percentiles[1, :].tolist(),
            "P90": percentiles[2, :].tolist(),
        }
        # log.info(self.hash)

        # save result
        pathWS = Path(baseAppPath, "~tmp", f"{self.ws}")
        if not pathWS.exists():
          os.makedirs(str(pathWS))
        with open(Path(pathWS,f"monte_{self.id}.bin"), "wb") as fs:
            lenTxt = len(self.hash)
            fs.write(struct.pack("@i", lenTxt))
            fs.write(struct.pack(f"@{lenTxt}s", str(self.hash).encode()))
            pickle.dump(outcomes, fs)

        self.progress = -1
        loop = asyncio.new_event_loop()
        loop.run_until_complete(
            wsMan.broadcast(
                json.dumps(
                    {
                        "module": "monte",
                        "id": self.id,
                        "data": {"progress": -1, "output": self.hash},
                    }
                )
            )
        )
        loop.close()

        print("Done")

    def run(self):
        # joinall([spawn(self.calculate)], timeout=1)
        # self.calculate()
        t2 = threading.Thread(target=self.calculate)
        t2.start()

        return True
