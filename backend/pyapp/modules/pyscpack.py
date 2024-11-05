import logging
import math
import os
import pickle
import random
import shutil
import string
import struct
from io import BufferedReader, BufferedWriter
from pathlib import Path
from sys import exception
from typing import Any, List

import numpy as np
from typing_extensions import Buffer

from .basePath import baseAppPath

log = logging.getLogger("uvicorn")


class pyscPacker:
    typeContract: int = 1
    __hfl: str = "pySCapp"
    __vfl: int = 19
    root_path = baseAppPath
    """
    ver.3: var (+) sign (1 byte) for Null int
    ver.4: (+) case data
    ver.5: (+) data sens and monte
    ver.6: (+) data optimization
    ver.7: (+) field post_uu_22_year2001:bool/def.=True/ (PSC),
           (+) field cum_production_split_offset:list[len proj]|float/def.=0/ (GS)
    ver.8: (+) data compare,
           (+) data combine
    ver.9: (+) inflation, disc.rate, disc year, disc mode, npv mode [data combine],  
    ver.10: (+) field: evaluator, evaluator_date  
    ver.11: (+) field: amortization for GS  
    ver.12: (+) field: delayAccMode, delayAccYear  
    ver.13: (+) field: profitability_discounted (Fiscal)
            (+) field: regime (Fiscal) GS Only  
            (+) field: prod_rate_baseline (lifting)
    ver.14: (+) field: oil_cost_of_sales_applied,gas_cost_of_sales_applied (CR)
            (+) table: COS
    ver.15: (+) field: useCOS (genConf)
            (?) fix COS table writing error
    ver.16: (+) table LBT
    ver.17: (+) data Incremental
    ver.18: (+) sum_undepreciated_cost
    ver.19: (+) lbtUseCalc (option in lbtcost)
            (+) switch cost record to object. ??? => easy to +/- field (if any changes again) 
    """

    def __init__(self, path: Path | None = None):
        if path:
            with open(path, "wb") as fs:
                # write header
                fs.write(struct.pack("@7si", self.__hfl.encode(), self.__vfl))
                fs.close()

    def isValidFileHeader(self, path: Path):
        with open(path, "rb") as fs:
            hfl, vfl = struct.unpack("@7si", fs.read(struct.calcsize("@7si")))
            return hfl == self.__hfl.encode() and vfl >= 4

    # def makePath(self, path: Path, filename: str):
    #     return Path(str(path), filename)

    def writeCase(
        self, isTmp: bool, path: Path, value: List, fsw: BufferedWriter | None = None
    ):
        if isTmp:
            filePath = Path(path, "cases.bin")
            out0 = fsw if fsw is not None else open(filePath, "wb")
            pickle.dump(value, out0)
        else:
            lcase: int = len(value)
            fs = fsw if fsw is not None else open(path, "ab")
            self.writePack(lcase, "i", fs)
            for i, icase in enumerate(value):
                self.writePack(icase["id"], "i", fs)
                self.writePack(icase["name"], "s", fs)
                self.writePack(icase["description"], "s", fs)
                self.writePack(icase["type"], "h", fs)
                self.writePack(icase["updated_at"], "q", fs)
                lidcase: int = 0 if icase["type"] != -1 else len(icase["multicase"])
                self.writePack(lidcase, "i", fs)
                if icase["type"] == -1 and lidcase > 0:
                    for i in range(lidcase):
                        self.writePack(icase["multicase"][i], "i", fs)
                # add evaluator key
                self.writePack(
                    icase["evaluator"] if "evaluator" in icase.keys() else "", "s", fs
                )
                self.writePack(
                    (
                        icase["evaluator_date"]
                        if "evaluator_date" in icase.keys()
                        else icase["updated_at"]
                    ),
                    "q",
                    fs,
                )

    def readCase(self, fs: BufferedReader, vfl: int):
        lencase = int(self.readPack("i", fs, 0))

        def getiCase():
            id = self.readPack("i", fs, 0)
            name = self.readPack("s", fs)
            description = self.readPack("s", fs)
            type = self.readPack("h", fs)
            updated_at = self.readPack("q", fs)
            lidcase = int(self.readPack("i", fs))
            multicase = (
                []
                if type != -1 or lidcase == 0
                else [self.readPack("i", fs) for ii in range(lidcase)]
            )
            evaluator = self.readPack("s", fs) if vfl >= 10 else ""
            evaluator_date = self.readPack("q", fs) if vfl >= 10 else updated_at
            return {
                "id": id,
                "name": name,
                "description": description,
                "type": type,
                "updated_at": updated_at,
                "multicase": multicase,
                "evaluator": evaluator,
                "evaluator_date": evaluator_date,
            }

        return [getiCase() for i in range(lencase)]

    def getCases(self, path: Path):
        with open(path, "rb") as fs:
            hfl, vfl = struct.unpack("@7si", fs.read(struct.calcsize("@7si")))
            return self.readCase(fs, vfl)

    def importCase(self, wsPath: Path, pathFile: Path, caseID: list, newCaseID: list):
        with open(pathFile, "rb") as fs:
            hfl, vfl = struct.unpack("@7si", fs.read(struct.calcsize("@7si")))

            fullcases = self.readCase(fs, vfl)
            selCase = [
                icase for idx, icase in enumerate(fullcases) if icase["id"] in caseID
            ]
            for idx, icase in enumerate(fullcases):
                writeData = icase["id"] in caseID
                caseid = (
                    newCaseID[caseID.index(icase["id"])] if writeData else icase["id"]
                )

                type_of_contract = int(self.readPack("i", fs, 1))
                genConf = {
                    "type_of_contract": type_of_contract,
                    "discount_rate_start_year": self.readPack("i", fs, 0),
                    "discount_rate": self.readPack("d", fs, 0.0),
                    "inflation_rate_applied_to": self.readPack("h", fs, 0),
                    "start_date_project": self.readPack("q", fs, 0),
                    "end_date_project": self.readPack("q", fs, 0),
                    "start_date_project_second": self.readPack("q", fs, 0),
                    "end_date_project_second": self.readPack("q", fs, 0),
                    # start ver. 12
                    "delayAccMode": self.readPack("h", fs, 0) if vfl >= 12 else 0,
                    "delayAccYear": self.readPack("h", fs, 0) if vfl >= 12 else 0,
                    # start ver. 15
                    "useCOS": self.readPack("?", fs, 0) if vfl >= 15 else False,
                    # start ver. 19
                    "lbtUseCalc": self.readPack("?", fs, 0) if vfl >= 19 else False,
                }
                fiscal = {
                    "Fiskal": self.readFiscalBase(fs, vfl),
                    "Fiskal2": self.readFiscalBase(fs, vfl),
                }
                producer = self.readProducer(fs, vfl)
                contracts = self.readcontrats(type_of_contract, fs, vfl)
                tangible = self.readCosts(0, fs, vfl)
                intangible = self.readCosts(1, fs, vfl)
                opex = self.readCosts(2, fs, vfl)
                asr = self.readCosts(3, fs, vfl)
                # error! miss write in ver.14, fix in ver.15
                cos = (
                    self.readCosts(4, fs, vfl)
                    if vfl >= 15
                    else [
                        {
                            "expense_year": None,
                            "cost_allocation": None,
                            "cost": None,
                            "tax_portion": None,
                            "description": None,
                        }
                    ]
                )
                lbt = (
                    self.readCosts(5, fs, vfl)
                    if vfl >= 16
                    else [
                        {
                            "expense_year": None,
                            "cost_allocation": None,
                            "cost": None,
                            "tax_portion": None,
                            "description": None,
                            "final_year": None,
                            "utilized_land_area": None,
                            "utilized_building_area": None,
                            "njop_land": None,
                            "njop_building": None,
                            "gross_revenue": None,
                        }
                    ]
                )
                if writeData:
                    with open(Path(wsPath, f"genconf_{caseid}.bin"), "wb") as out1:
                        pickle.dump(genConf, out1)
                    with open(Path(wsPath, f"fiscal_{caseid}.bin"), "wb") as out2:
                        pickle.dump(fiscal, out2)
                    with open(Path(wsPath, f"producer_{caseid}.bin"), "wb") as out3:
                        pickle.dump(producer, out3)
                    with open(Path(wsPath, f"contracts_{caseid}.bin"), "wb") as out4:
                        pickle.dump(contracts, out4)
                    with open(Path(wsPath, f"tangiblev2_{caseid}.bin"), "wb") as out5:
                        pickle.dump(tangible, out5)
                    with open(Path(wsPath, f"intangiblev2_{caseid}.bin"), "wb") as out6:
                        pickle.dump(intangible, out6)
                    with open(Path(wsPath, f"opexv2_{caseid}.bin"), "wb") as out7:
                        pickle.dump(opex, out7)
                    with open(Path(wsPath, f"asrv2_{caseid}.bin"), "wb") as out8:
                        pickle.dump(asr, out8)
                    with open(Path(wsPath, f"cosv2_{caseid}.bin"), "wb") as out11:
                        pickle.dump(cos, out11)
                    with open(Path(wsPath, f"lbtv2_{caseid}.bin"), "wb") as out12:
                        pickle.dump(lbt, out12)
            if vfl >= 5:
                # extract sens
                for idx, icase in enumerate(fullcases):
                    writeData = icase["id"] in caseID
                    caseid = (
                        newCaseID[caseID.index(icase["id"])]
                        if writeData
                        else icase["id"]
                    )
                    self.extractSens(wsPath, fs, caseid, writeData)

                # extract monte
                for idx, icase in enumerate(fullcases):
                    writeData = icase["id"] in caseID
                    caseid = (
                        newCaseID[caseID.index(icase["id"])]
                        if writeData
                        else icase["id"]
                    )
                    self.extractMonte(wsPath, fs, caseid, writeData)

                if vfl >= 6:
                    # extract optim
                    for idx, icase in enumerate(fullcases):
                        writeData = icase["id"] in caseID
                        caseid = (
                            newCaseID[caseID.index(icase["id"])]
                            if writeData
                            else icase["id"]
                        )
                        self.extractOptim(wsPath, fs, caseid, writeData)

            return selCase

    def writeProject(self, wsPath: Path, path: Path):
        cases = self.loadCases(wsPath)
        with open(path, "ab") as fs:
            self.writeCase(False, Path(), cases, fs)
            for idx, icase in enumerate(cases):
                self.typeContract = icase["type"]
                id = icase["id"]
                self.writeGenConfig(Path(), self.loadGenConfig(wsPath, id), fs)
                self.writeFiscalConfig(Path(), self.loadFiscalConfig(wsPath, id), fs)
                self.writeProducer(Path(), self.loadproducer(wsPath, id), fs)
                self.writecontrats(
                    Path(), self.typeContract, self.loadcontracts(wsPath, id), fs
                )
                # tangible
                self.writeCosts(Path(), 0, self.loadCosts(0, wsPath, id), fs)
                # intanginble
                self.writeCosts(Path(), 1, self.loadCosts(1, wsPath, id), fs)
                # opex
                self.writeCosts(Path(), 2, self.loadCosts(2, wsPath, id), fs)
                # ars
                self.writeCosts(Path(), 3, self.loadCosts(3, wsPath, id), fs)
                # cos
                # miss write in ver.14, fix in ver.15
                self.writeCosts(Path(), 4, self.loadCosts(4, wsPath, id), fs)
                # LBT
                self.writeCosts(Path(), 5, self.loadCosts(5, wsPath, id), fs)

            # write sens
            for idx, icase in enumerate(cases):
                self.writeSens(Path(), self.loadsens(wsPath, icase["id"]), fs)

            # write monte
            for idx, icase in enumerate(cases):
                monteCfg = self.loadmonte(wsPath, icase["id"])
                monteRes = self.loadmonteRes(wsPath, icase["id"])
                self.writeMonte(Path(), monteCfg, fs)
                self.writeMonteRes(Path(), monteRes, fs)

            # write optim
            for idx, icase in enumerate(cases):
                optimCfg = self.loadoptim(wsPath, icase["id"])
                self.writeOptim(Path(), optimCfg, fs)
            # write compare
            comp_ = self.loadCompare(wsPath)
            self.writeCompareConf(None, comp_, fs)
            # write combine
            comb_ = self.loadCombine(wsPath)
            self.writeCombineConf(None, comb_, fs)
            # write incremental
            incr_ = self.loadIncr(wsPath)
            self.writeIncrConf(None, incr_, fs)

        return True

    def writeGenConfig(
        self, path: Path, value: dict, fsw: BufferedWriter | None = None
    ):
        fs = fsw if fsw is not None else open(path, "ab")
        self.writePack(value["type_of_contract"], "i", fs)
        self.writePack(value["discount_rate_start_year"], "i", fs)
        self.writePack(value["discount_rate"], "d", fs)
        self.writePack(value["inflation_rate_applied_to"], "h", fs)
        self.writePack(value["start_date_project"], "q", fs)
        self.writePack(value["end_date_project"], "q", fs)
        self.writePack(value["start_date_project_second"] | 0, "q", fs)
        self.writePack(value["end_date_project_second"] | 0, "q", fs)
        # start ver 12
        self.writePack(
            value["delayAccMode"] if "delayAccMode" in value.keys() else 0, "h", fs
        )
        self.writePack(
            value["delayAccYear"] if "delayAccYear" in value.keys() else 0, "h", fs
        )
        # start ver 15
        self.writePack(value["useCOS"] if "useCOS" in value.keys() else False, "?", fs)
        # start ver 19
        self.writePack(
            value["lbtUseCalc"] if "lbtUseCalc" in value.keys() else False, "?", fs
        )

    def getFormatIndex(self, fmtType: List | str, index: int) -> str:
        if isinstance(fmtType, List):
            return fmtType[index] if index < len(fmtType) else fmtType[-1]
        else:
            return fmtType

    def writePack(self, val, fmt: str, fs: BufferedWriter):
        if fmt == "s":
            lenTxt = len(val) if val is not None else 0
            fs.write(struct.pack("@i", lenTxt))
            if lenTxt > 0:
                fs.write(struct.pack(f"@{lenTxt}s", str(val).encode()))
        elif fmt == "?":
            fs.write(struct.pack("@?", True if val else False))
        else:
            if val is not None and isinstance(val, str):
                if fmt in ["f", "d"]:
                    val = float(val) if len(val.strip()) else None
                else:
                    val = int(val) if len(val.strip()) else None
            if fmt in ["f", "d"]:
                fs.write(
                    struct.pack(
                        f"@{fmt}",
                        val if val is not None else np.nan,
                    )
                )
            else:
                # integer
                fs.write(struct.pack("@?", True if val is not None else False))
                if val is not None:
                    fs.write(struct.pack(f"@{fmt}", val))

    def readPack(self, fmt: str, fs: BufferedReader, defval: Any = None):
        if fmt.find("s") != -1:
            # string
            if len(fmt) != 1:
                (val,) = struct.unpack(f"@{fmt}", fs.read(struct.calcsize(f"@{fmt}")))
                return val.decode("utf-8") if isinstance(val, bytes) else defval
            else:
                (lentxt,) = struct.unpack("@i", fs.read(struct.calcsize("@i")))
                (val,) = struct.unpack(
                    f"@{lentxt}s", fs.read(struct.calcsize(f"@{lentxt}s"))
                )
                return val.decode("utf-8") if isinstance(val, bytes) else defval
        elif fmt in ["f", "d"]:
            # float
            (val,) = struct.unpack(f"@{fmt}", fs.read(struct.calcsize(f"@{fmt}")))
            return val if not math.isnan(val) else defval
        else:
            # int
            (isval,) = struct.unpack("@?", fs.read(struct.calcsize("@?")))
            if fmt == "?":
                return True if isval else defval
            elif isval:
                (val,) = struct.unpack(f"@{fmt}", fs.read(struct.calcsize(f"@{fmt}")))
                return val
            else:
                return defval

    def writeTable(self, arr: dict | List, fmtType: List, fs: BufferedWriter):
        self.writePack(len(arr), "i", fs)
        if len(arr) > 0:
            if isinstance(arr[0], List):
                self.writePack(len(arr[0]), "i", fs)
            for i, item in enumerate(arr):
                if isinstance(item, dict):
                    for idx, key in enumerate(item.keys()):
                        self.writePack(item[key], self.getFormatIndex(fmtType, idx), fs)
                else:
                    for ii, val in enumerate(item):
                        self.writePack(val, self.getFormatIndex(fmtType, ii), fs)

    def readTable(self, fmtType: dict | List, fs: BufferedReader, vfl: int = __vfl):
        def getfmt(index):
            return fmtType[index] if index < fmtType else fmtType[-1]

        lenTable = int(self.readPack("i", fs, 0))
        if lenTable > 0:
            if isinstance(fmtType, dict):
                return [
                    {
                        f"{key}": self.readPack(fmtType[key], fs)
                        for idx, key in enumerate(fmtType.keys())
                    }
                    for i in range(lenTable)
                ]
            else:
                cols = int(self.readPack("i", fs, 0))
                return [
                    [self.readPack(getfmt(ii), fs) for ii in range(cols)]
                    for i in range(lenTable)
                ]
        else:
            if isinstance(fmtType, dict):
                return [{f"{key}": None for idx, key in enumerate(fmtType.keys())}]
            else:
                return [[None] * len(fmtType)]

    def writeTax(self, tax: dict, fs: BufferedWriter):
        self.writePack(tax["tax_mode"], "h", fs)
        self.writePack(tax["tax_rate_init"], "d", fs)
        self.writeTable(tax["multi_tax_init"], ["i", "d"], fs)

    def readTax(self, fs: BufferedReader) -> dict:
        return {
            "tax_mode": self.readPack("h", fs, 0),
            "tax_rate_init": self.readPack("d", fs, 0.0),
            "multi_tax_init": self.readTable({"year": "i", "rate": "d"}, fs),
        }

    def writeDep(self, dep: dict, fs: BufferedWriter):
        self.writePack(dep["depreciation_method"], "h", fs)
        self.writePack(dep["decline_factor"], "d", fs)

    def readDep(self, fs: BufferedReader):
        return {
            "depreciation_method": self.readPack("h", fs, 0),
            "decline_factor": self.readPack("d", fs, 0.0),
        }

    def writeInflation(self, inflat: dict, fs: BufferedWriter):
        self.writePack(inflat["inflation_rate_mode"], "h", fs)
        self.writePack(inflat["inflation_rate_init"], "d", fs)
        self.writeTable(inflat["multi_inflation_init"], ["i", "d"], fs)

    def readInflation(self, fs: BufferedReader):
        return {
            "inflation_rate_mode": self.readPack("h", fs, 0),
            "inflation_rate_init": self.readPack("d", fs, 0.0),
            "multi_inflation_init": self.readTable({"year": "i", "rate": "d"}, fs),
        }

    def writeVAT(self, vat: dict, fs: BufferedWriter):
        self.writePack(vat["vat_mode"], "h", fs)
        self.writePack(vat["vat_rate_init"], "d", fs)
        self.writeTable(vat["multi_vat_init"], ["i", "d"], fs)

    def readVAT(self, fs: BufferedReader):
        return {
            "vat_mode": self.readPack("h", fs, 0),
            "vat_rate_init": self.readPack("d", fs, 0.0),
            "multi_vat_init": self.readTable({"year": "i", "rate": "d"}, fs),
        }

    def writeLBT(self, lbt: dict, fs: BufferedWriter):
        self.writePack(lbt["lbt_mode"], "h", fs)
        self.writePack(lbt["lbt_rate_init"], "d", fs)
        self.writeTable(lbt["multi_lbt_init"], ["i", "d"], fs)

    def readLBT(self, fs: BufferedReader):
        return {
            "lbt_mode": self.readPack("h", fs, 0),
            "lbt_rate_init": self.readPack("d", fs, 0.0),
            "multi_lbt_init": self.readTable({"year": "i", "rate": "d"}, fs),
        }

    def writeFiscalBase(self, value: dict, fs: BufferedWriter):
        self.writePack(value["transferred_unrec_cost"], "d", fs)
        self.writeTax(value["Tax"], fs)
        self.writePack(value["tax_payment_config"], "h", fs)
        self.writePack(value["asr_future_rate"], "d", fs)
        self.writeDep(value["Depreciation"], fs)
        self.writeInflation(value["Inflation"], fs)
        self.writeVAT(value["VAT"], fs)
        self.writeLBT(value["LBT"], fs)
        self.writePack(value["vat_discount"], "d", fs)
        self.writePack(value["lbt_discount"], "d", fs)
        self.writePack(value["npv_mode"], "h", fs)
        self.writePack(value["discounting_mode"], "h", fs)

        self.writePack(value["sulfur_revenue_config"], "h", fs)
        self.writePack(value["electricity_revenue_config"], "h", fs)
        self.writePack(value["co2_revenue_config"], "h", fs)

        self.writePack(value["sunk_cost_reference_year"], "i", fs)
        # versi 13
        self.writePack(
            (
                value["profitability_discounted"]
                if "profitability_discounted" in value.keys()
                else False
            ),
            "?",
            fs,
        )
        self.writePack(value["regime"] if "regime" in value.keys() else 3, "h", fs)
        # versi 18
        self.writePack(
            (
                value["sum_undepreciated_cost"]
                if "sum_undepreciated_cost" in value.keys()
                else True
            ),
            "?",
            fs,
        )

    def readFiscalBase(self, fs: BufferedReader, vfl: int) -> dict:
        return {
            "transferred_unrec_cost": self.readPack("d", fs, 0.0),
            "Tax": self.readTax(fs),
            "tax_payment_config": self.readPack("h", fs, 0),
            "asr_future_rate": self.readPack("d", fs, 0.0),
            "Depreciation": self.readDep(fs),
            "Inflation": self.readInflation(fs),
            "VAT": self.readVAT(fs),
            "LBT": self.readLBT(fs),
            "vat_discount": self.readPack("d", fs, 0.0),
            "lbt_discount": self.readPack("d", fs, 0.0),
            "npv_mode": self.readPack("h", fs, 0),
            "discounting_mode": self.readPack("h", fs, 0),
            "sulfur_revenue_config": self.readPack("h", fs, 0),
            "electricity_revenue_config": self.readPack("h", fs, 0),
            "co2_revenue_config": self.readPack("h", fs, 0),
            "sunk_cost_reference_year": self.readPack("i", fs, 0),
            # versi 13
            "profitability_discounted": (
                self.readPack("?", fs, False) if vfl >= 13 else False
            ),
            "regime": self.readPack("h", fs, 3) if vfl >= 13 else 3,
            # versi 18
            "sum_undepreciated_cost": (
                self.readPack("?", fs, True) if vfl >= 18 else True
            ),
        }

    def writeDMO(self, value: dict, fs: BufferedWriter):
        self.writePack(bool(value["holiday"]), "?", fs)
        self.writePack(value["period"], "i", fs)
        self.writePack(value["start_production"], "q", fs)
        self.writePack(value["volume"], "d", fs)
        self.writePack(value["fee"], "d", fs)

    def readDMO(self, fs: BufferedReader):
        return {
            "holiday": self.readPack("?", fs, False),
            "period": self.readPack("i", fs, 0),
            "start_production": self.readPack("q", fs, 0),
            "volume": self.readPack("d", fs, 0.0),
            "fee": self.readPack("d", fs, 0.0),
        }

    def writecostRecConfig(self, cr: dict, fs: BufferedWriter):
        def writeFTP(ftpD: dict):
            self.writePack(bool(ftpD["ftp_availability"]), "?", fs)
            self.writePack(bool(ftpD["ftp_is_shared"]), "?", fs)
            self.writePack(ftpD["ftp_portion"], "d", fs)

        def writeTaxSplit(taxS: dict):
            self.writePack(taxS["split_type"], "h", fs)
            self.writePack(taxS["pre_tax_ctr_oil"], "d", fs)
            self.writePack(taxS["pre_tax_ctr_gas"], "d", fs)

        def writeIC(icS: dict):
            self.writePack(bool(icS["ic_availability"]), "?", fs)
            self.writePack(icS["ic_oil"], "d", fs)
            self.writePack(icS["ic_gas"], "d", fs)

        def writeCR(crS: dict):
            self.writePack(crS["oil_cr_cap_rate"], "d", fs)
            self.writePack(crS["gas_cr_cap_rate"], "d", fs)

        writeFTP(cr["oil_ftp"])
        writeFTP(cr["gas_ftp"])
        writeTaxSplit(cr["TaxSplit"])
        writeIC(cr["IC"])
        writeCR(cr["CR"])

        self.writeTable(cr["RCSlidingScale"], ["d", "d", "d", "d"], fs)
        self.writeTable(cr["ICPSlidingScale"], ["d", "d", "d", "d"], fs)
        self.writeTable(cr["Indicator"], ["i", "d"], fs)

        self.writePack(bool(cr["dmo_is_weighted"]), "?", fs)
        self.writeDMO(cr["OilDMO"], fs)
        self.writeDMO(cr["GasDMO"], fs)

        # (+) field post_uu_22_year2001:bool/def.=True/ (PSC)
        self.writePack(bool(cr["post_uu_22_year2001"]), "?", fs)

        # (+) field oil_cost_of_sales_applied:bool/def.=False/ (PSC)
        # (+) field gas_cost_of_sales_applied:bool/def.=False/ (PSC)
        self.writePack(bool(cr["oil_cost_of_sales_applied"]), "?", fs)
        self.writePack(bool(cr["gas_cost_of_sales_applied"]), "?", fs)

    def readcostRecConfig(self, fs: BufferedReader, vfl: int):
        def readFTP():
            return {
                "ftp_availability": self.readPack("?", fs, False),
                "ftp_is_shared": self.readPack("?", fs, False),
                "ftp_portion": self.readPack("d", fs, 0.0),
            }

        def readTaxSplit():
            return {
                "split_type": self.readPack("h", fs, 0),
                "pre_tax_ctr_oil": self.readPack("d", fs, 0.0),
                "pre_tax_ctr_gas": self.readPack("d", fs, 0.0),
            }

        def readIC():
            return {
                "ic_availability": self.readPack("?", fs, False),
                "ic_oil": self.readPack("d", fs, 0.0),
                "ic_gas": self.readPack("d", fs, 0.0),
            }

        def readCR():
            return {
                "oil_cr_cap_rate": self.readPack("d", fs, 0.0),
                "gas_cr_cap_rate": self.readPack("d", fs, 0.0),
            }

        costrec_ = {
            "oil_ftp": readFTP(),
            "gas_ftp": readFTP(),
            "TaxSplit": readTaxSplit(),
            "IC": readIC(),
            "CR": readCR(),
            "RCSlidingScale": self.readTable(
                {
                    "bottom_limit": "d",
                    "top_limit": "d",
                    "pre_tax_ctr_oil": "d",
                    "pre_tax_ctr_gas": "d",
                },
                fs,
            ),
            "ICPSlidingScale": self.readTable(
                {
                    "bottom_limit": "d",
                    "top_limit": "d",
                    "pre_tax_ctr_oil": "d",
                    "pre_tax_ctr_gas": "d",
                },
                fs,
            ),
            "Indicator": self.readTable({"year": "i", "indicator": "d"}, fs),
            "dmo_is_weighted": self.readPack("?", fs, False),
            "OilDMO": self.readDMO(fs),
            "GasDMO": self.readDMO(fs),
        }
        if vfl >= 7:
            costrec_.update({"post_uu_22_year2001": self.readPack("?", fs, True)})
        else:
            costrec_.update({"post_uu_22_year2001": True})
        if vfl >= 14:
            costrec_.update(
                {"oil_cost_of_sales_applied": self.readPack("?", fs, False)}
            )
            costrec_.update(
                {"gas_cost_of_sales_applied": self.readPack("?", fs, False)}
            )
        else:
            costrec_.update({"oil_cost_of_sales_applied": False})
            costrec_.update({"gas_cost_of_sales_applied": False})
        return costrec_

    def writegsConfig(self, gs: dict, fs: BufferedWriter):
        self.writePack(gs["field_status"], "h", fs)
        self.writePack(gs["field_location"], "h", fs)
        self.writePack(gs["reservoir_depth"], "h", fs)
        self.writePack(gs["infrastructure_availability"], "h", fs)
        self.writePack(gs["reservoir_type"], "h", fs)
        self.writePack(gs["co2_content"], "h", fs)
        self.writePack(gs["h2s_content"], "h", fs)
        self.writePack(gs["oil_api"], "h", fs)
        self.writePack(gs["domestic_content_use"], "h", fs)
        self.writePack(gs["production_stage"], "h", fs)

        self.writePack(gs["ministry_discretion_split"], "d", fs)
        self.writePack(gs["oil_base_split"], "d", fs)
        self.writePack(gs["gas_base_split"], "d", fs)

        self.writePack(bool(gs["dmo_is_weighted"]), "?", fs)
        self.writeDMO(gs["OilDMO"], fs)
        self.writeDMO(gs["GasDMO"], fs)

        # start on vfl=7
        self.writePack(gs["cum_production_split_offset"]["mode"], "h", fs)
        self.writePack(gs["cum_production_split_offset"]["offset"], "d", fs)
        self.writeTable(gs["cum_production_split_offset"]["split"], ["i", "d"], fs)
        # start on vfl=11
        self.writePack(
            gs["amortization"] if "amortization" in gs.keys() else False, "?", fs
        )

    def readgsConfig(self, fs: BufferedReader, vfl: int):
        gs_ = {
            "field_status": self.readPack("h", fs, 0),
            "field_location": self.readPack("h", fs, 0),
            "reservoir_depth": self.readPack("h", fs, 0),
            "infrastructure_availability": self.readPack("h", fs, 0),
            "reservoir_type": self.readPack("h", fs, 0),
            "co2_content": self.readPack("h", fs, 0),
            "h2s_content": self.readPack("h", fs, 0),
            "oil_api": self.readPack("h", fs, 0),
            "domestic_content_use": self.readPack("h", fs, 0),
            "production_stage": self.readPack("h", fs, 0),
            "ministry_discretion_split": self.readPack("d", fs, 0.0),
            "oil_base_split": self.readPack("d", fs, 0.0),
            "gas_base_split": self.readPack("d", fs, 0.0),
            "dmo_is_weighted": self.readPack("?", fs, False),
            "OilDMO": self.readDMO(fs),
            "GasDMO": self.readDMO(fs),
            # vfl>=7
            "cum_production_split_offset": {"mode": 0, "offset": 0, "split": []},
            # vfl>=11
            "amortization": False,
        }
        if vfl >= 7:
            gs_["cum_production_split_offset"]["mode"] = self.readPack("h", fs, 0)
            gs_["cum_production_split_offset"]["offset"] = self.readPack("d", fs, 0)
            splitTable = self.readTable(
                {"year": "i", "split": "d"},
                fs,
            )
            if isinstance(splitTable, bool):
                splitTable = []
            gs_["cum_production_split_offset"]["split"] = splitTable
        if vfl >= 11:
            gs_["amortization"] = self.readPack("?", fs, False)

        return gs_

    def writeFiscalConfig(
        self, path: Path, value: dict, fsw: BufferedWriter | None = None
    ):
        fs = fsw if fsw is not None else open(path, "ab")
        self.writeFiscalBase(value["Fiskal"], fs)
        self.writeFiscalBase(value["Fiskal2"], fs)

    def writeProducer(self, path: Path, value: dict, fsw: BufferedWriter | None = None):
        fs = fsw if fsw is not None else open(path, "ab")
        self.writePack(len(value), "i", fs)
        for prod in value:
            tipeProd: int = prod["Tipe"]
            self.writePack(tipeProd, "h", fs)
            self.writePack(prod["onstream_date"], "q", fs)
            self.writePack(prod["ProdNumber"], "h", fs)
            self.writePack(prod["GSANumber"], "h", fs)
            prod_price = prod["prod_price"]
            # num ProdNumber
            self.writePack(len(prod_price), "i", fs)
            for iProd in range(prod["ProdNumber"]):
                prodItem = prod_price[iProd]
                if tipeProd == 1:  # Gas Producer
                    self.writePack(len(prodItem), "i", fs)
                    if len(prodItem) > 0:
                        for i, item in enumerate(prodItem):
                            if isinstance(item, dict):
                                self.writePack(item["year"], "i", fs)
                                self.writePack(item["production"], "d", fs)
                                gsa: dict = item["gsa"]
                                keys = gsa.keys()
                                self.writePack(len(keys), "i", fs)
                                for idx, key in enumerate(keys):
                                    self.writePack(gsa[key], "d", fs)
                                # versi 13
                                self.writePack(
                                    item["base"] if "base" in item.keys() else None,
                                    "d",
                                    fs,
                                )
                else:
                    self.writePack(len(prodItem), "i", fs)
                    if len(prodItem) > 0:
                        for i, item in enumerate(prodItem):
                            if isinstance(item, dict):
                                for idx, key in enumerate(item.keys()):
                                    self.writePack(
                                        item[key], "i" if key == "year" else "d", fs
                                    )
                                # versi 13
                                if "base" not in item.keys():
                                    self.writePack(None, "d", fs)
                    # self.writeTable(prodItem, ["i", "d"], fs)

    def readProducer(self, fs: BufferedReader, vfl: int):
        def readGSA():
            # read len keys
            lenKey = int(self.readPack("i", fs, 0))
            gsa = {}
            for i in range(lenKey // 3):
                gsa.update(
                    {
                        f"vol{i+1}": self.readPack("d", fs),
                        f"ghv{i+1}": self.readPack("d", fs),
                        f"price{i+1}": self.readPack("d", fs),
                    }
                )
            return gsa

        def readTable_(tipeProd: int):
            if tipeProd == 0:  # Oil Producer
                return self.readTable(
                    (
                        {
                            "year": "i",
                            "sales": "d",
                            "price": "d",
                            "condensate_sales": "d",
                            "condensate_price": "d",
                            "base": "d",
                        }
                        if vfl >= 13
                        else {
                            "year": "i",
                            "sales": "d",
                            "price": "d",
                            "condensate_sales": "d",
                            "condensate_price": "d",
                        }
                    ),
                    fs,
                )
            elif tipeProd == 1:  # Gas Producer
                len_iTable = int(self.readPack("i", fs, 0))
                return [
                    (
                        {
                            "year": self.readPack("i", fs),
                            "production": self.readPack("d", fs),
                            "gsa": readGSA(),
                            "base": self.readPack("d", fs),
                        }
                        if vfl >= 13
                        else {
                            "year": self.readPack("i", fs),
                            "production": self.readPack("d", fs),
                            "gsa": readGSA(),
                        }
                    )
                    for i in range(len_iTable)
                ]
            else:
                return self.readTable(
                    (
                        {"year": "i", "sales": "d", "price": "d", "base": "d"}
                        if vfl >= 13
                        else {"year": "i", "sales": "d", "price": "d"}
                    ),
                    fs,
                )

        def readProdPrice(tipeProd: int):
            TableProdPrice = []
            # num Producer
            lenProd = int(self.readPack("i", fs, 0))
            for iProd in range(lenProd):
                iTable = readTable_(tipeProd)
                if not iTable:
                    # def value
                    if tipeProd == 0:  # Oil Producer
                        TableProdPrice.append(
                            [
                                {
                                    "year": None,
                                    "sales": None,
                                    "price": None,
                                    "condensate_sales": None,
                                    "condensate_price": None,
                                    "base": None,
                                }
                            ]
                        )
                    elif tipeProd == 1:  # Gas Producer
                        TableProdPrice.append(
                            [
                                {
                                    "year": None,
                                    "production": None,
                                    "gsa": {"vol1": None, "ghv1": None, "price1": None},
                                    "base": None,
                                }
                            ]
                        )
                    else:
                        TableProdPrice.append(
                            [{"year": None, "sales": None, "price": None, "base": None}]
                        )
                else:
                    TableProdPrice.append(iTable)
            return TableProdPrice

        def readProd():
            tipeProd = int(self.readPack("h", fs, 0))
            return {
                "Tipe": tipeProd,
                "onstream_date": self.readPack("q", fs, 0),
                "ProdNumber": self.readPack("h", fs, 1),
                "GSANumber": self.readPack("h", fs, 1),
                "prod_price": readProdPrice(tipeProd),
            }

        lenProd = int(self.readPack("i", fs, 0))
        if lenProd > 0:
            return [readProd() for i in range(lenProd)]
        else:
            return []

    def writecontrats(
        self, path: Path, tipe: int, value: dict, fsw: BufferedWriter | None = None
    ):
        fs = fsw if fsw is not None else open(path, "ab")
        self.writecostRecConfig(value["cr"], fs)
        self.writegsConfig(value["gs"], fs)
        if tipe >= 3:
            (
                self.writecostRecConfig(value["second"], fs)
                if tipe in [3, 6]
                else self.writegsConfig(value["second"], fs)
            )

    def readcontrats(self, tipe: int, fs: BufferedReader, vfl: int):
        result = {
            "cr": self.readcostRecConfig(fs, vfl),
            "gs": self.readgsConfig(fs, vfl),
            "second": None,
        }
        if tipe >= 3:
            result.update(
                {"second": self.readcostRecConfig(fs, vfl)}
                if tipe in [3, 6]
                else {"second": self.readgsConfig(fs, vfl)}
            )
        return result

    def writeCosts(
        self, path: Path, mode: int, value: List, fsw: BufferedWriter | None = None
    ):
        fs = fsw if fsw is not None else open(path, "ab")

        def writeField(k: str, val: any, fmt: str):
            if k == "cost_allocation":
                val = 0 if val == "Oil" else (1 if val == "Gas" else None)
            elif k == "is_ic_applied":
                val = 1 if val == "Yes" else None
            self.writePack(val, fmt, fs)

        # fmt = ["d"]
        # cvvalue = [
        #     [
        #         (
        #             0
        #             if icol == 1 and col == "Oil"
        #             else (
        #                 1
        #                 if icol == 1 and col == "Gas"
        #                 else (
        #                     1
        #                     if mode == 0 and icol == 6 and col == "Yes"
        #                     else 0
        #                     if mode == 0 and icol == 6 and col == "No"
        #                     else col
        #                 )
        #             )
        #         )
        #         for icol, col in enumerate(
        #             row
        #             if len(row) == len(fmt)
        #             else (
        #                 row[: len(fmt) - 1]
        #                 if len(row) > len(fmt)
        #                 else row + [None] * (len(fmt) - len(row))
        #             )
        #         )
        #     ]
        #     for irow, row in enumerate(value)
        # ]
        if mode == 0:  # tangible
            fmt = {
                "expense_year": "i",
                "cost_allocation": "h",
                "cost": "d",
                "pis_year": "i",
                "useful_life": "i",
                "depreciation_factor": "d",
                "is_ic_applied": "h",
                "tax_portion": "d",
                "description": "s",
            }
        elif mode == 1:  # intangible
            fmt = {
                "expense_year": "i",
                "cost_allocation": "h",
                "cost": "d",
                "tax_portion": "d",
                "description": "s",
            }
        elif mode == 2:  # opex
            fmt = {
                "expense_year": "i",
                "cost_allocation": "h",
                "fixed_cost": "d",
                "prod_rate": "d",
                "cost_per_volume": "d",
                "tax_portion": "d",
                "description": "s",
            }
        elif mode == 3:  # asr
            fmt = {
                "expense_year": "i",
                "cost_allocation": "h",
                "cost": "d",
                "final_year": "i",
                "tax_portion": "d",
                "description": "s",
            }
        elif mode == 4:  # COS
            fmt = {
                "expense_year": "i",
                "cost_allocation": "h",
                "cost": "d",
                "tax_portion": "d",
                "description": "s",
            }
        else:  # LBT
            fmt = {
                "expense_year": "i",
                "cost_allocation": "h",
                "cost": "d",
                "tax_portion": "d",
                "description": "d",
                "final_year": "i",
                "utilized_land_area": "d",
                "utilized_building_area": "d",
                "njop_land": "d",
                "njop_building": "d",
                "gross_revenue": "d",
            }
        self.writePack(len(value), "i", fs)
        if len(value) > 0:
            keyfmt = fmt.keys()
            for i, row in enumerate(value):
                keyData = row.keys()
                for c, k in enumerate(keyfmt):
                    writeField(k, row[k] if k in keyData else None, fmt[k])

        # if mode == 0:  # tangible
        #     fmt = ["i", "h", "d", "i", "i", "d", "h", "d", "s"]
        # elif mode == 1:  # intangible
        #     fmt = ["i", "h", "d", "d", "s"]
        # elif mode == 2:  # opex
        #     fmt = ["i", "h", "d", "d", "d", "d", "d", "s"]
        # elif mode == 3:  # asr
        #     fmt = ["i", "h", "d", "s"]
        # elif mode == 4:  # COS
        #     fmt = ["i", "h", "d"]
        # elif mode == 5:  # LBT
        #     fmt = ["i", "h", "d", "d", "s"]
        # self.writeTable(cvvalue, fmt, fs)

    def readCosts(self, mode: int, fs: BufferedReader, vfl: int):
        def readTableList(fmt: List, vt: List) -> List[Any]:
            def readField(index: int | str, ivt: str):
                val = self.readPack(ivt, fs)
                if (index == 1 or index == "cost_allocation") and val is not None:
                    return "Gas" if val == 1 else "Oil"
                elif (
                    mode == 0 and (index == 6 or index == "is_ic_applied")
                ) and val is not None:
                    return "Yes" if val == 1 else "No"
                return val

            lenTable = int(self.readPack("i", fs, 0))
            if lenTable > 0:
                if vfl >= 19:
                    return [
                        {
                            f"{k}": readField(k, fmt["fmt"][k])
                            for ir, k in enumerate(fmt["fmt"].keys())
                        }
                        for i in range(lenTable)
                    ]
                else:
                    result_ = []
                    cols = self.readPack("i", fs, 0)
                    cvt = vt
                    if cols > 0 and cols > len(vt):
                        cvt = vt + ["s"] * (cols - len(vt))
                    for i in range(lenTable):
                        rows = {f"{k}": None for ik, k in enumerate(fmt["fmt"].keys())}
                        if cols > 0:
                            vrow = [readField(ii, ivt) for ii, ivt in enumerate(cvt)]
                            for ik, k in enumerate(fmt["fmt"].keys()):
                                if fmt["colMap"][ik] is not None and fmt["colMap"][
                                    ik
                                ] < len(vrow):
                                    rows[k] = vrow[fmt["colMap"][ik]]
                        result_.append(rows)
                    return result_
            else:
                return [{f"{k}": None for ik, k in enumerate(fmt["fmt"].keys())}]

        # fmt = ["d"]
        if mode == 0:  # tangible
            fmt = {
                "fmt": {
                    "expense_year": "i",
                    "cost_allocation": "h",
                    "cost": "d",
                    "pis_year": "i",
                    "useful_life": "i",
                    "depreciation_factor": "d",
                    "is_ic_applied": "h",
                    "tax_portion": "d",
                    "description": "s",
                },
                "colMap": [0, 1, 2, 3, 4, 5, 6, 7, 8],
            }
            return readTableList(fmt, ["i", "h", "d", "i", "i", "d", "h", "d", "s"])
        elif mode == 1:  # intangible
            fmt = {
                "fmt": {
                    "expense_year": "i",
                    "cost_allocation": "h",
                    "cost": "d",
                    "tax_portion": "d",
                    "description": "s",
                },
                "colMap": [0, 1, 2, 3, 4],
            }
            return readTableList(fmt, ["i", "h", "d", "d", "s"])
        elif mode == 2:  # opex
            fmt = {
                "fmt": {
                    "expense_year": "i",
                    "cost_allocation": "h",
                    "fixed_cost": "d",
                    "prod_rate": "d",
                    "cost_per_volume": "d",
                    "tax_portion": "d",
                    "description": "s",
                },
                "colMap": [0, 1, 2, 3, 4, 5, 7],
            }
            return readTableList(fmt, ["i", "h", "d", "d", "d", "d", "d", "s"])
        elif mode == 3:  # asr
            fmt = {
                "fmt": {
                    "expense_year": "i",
                    "cost_allocation": "h",
                    "cost": "d",
                    "final_year": "i",
                    "tax_portion": "d",
                    "description": "s",
                },
                "colMap": [0, 1, 2, None, None, 3],
            }
            return readTableList(fmt, ["i", "h", "d", "s"])
        elif mode == 4:  # COS
            fmt = {
                "fmt": {
                    "expense_year": "i",
                    "cost_allocation": "h",
                    "cost": "d",
                    "tax_portion": "d",
                    "description": "s",
                },
                "colMap": [0, 1, 2, None, None],
            }
            return readTableList(fmt, ["i", "h", "d"])
        elif mode == 5:  # LBT
            fmt = {
                "fmt": {
                    "expense_year": "i",
                    "cost_allocation": "h",
                    "cost": "d",
                    "tax_portion": "d",
                    "description": "d",
                    "final_year": "i",
                    "utilized_land_area": "d",
                    "utilized_building_area": "d",
                    "njop_land": "d",
                    "njop_building": "d",
                    "gross_revenue": "d",
                },
                "colMap": [0, 1, 2, 3, 4, None, None, None, None, None, None],
            }
            return readTableList(fmt, ["i", "h", "d", "d", "s"])
        return []

    def ExtractFile(self, source: Path, target: Path, useID: bool = False):
        with open(source, "rb") as fs:
            hfl, vfl = struct.unpack("@7si", fs.read(struct.calcsize("@7si")))
            if hfl != self.__hfl.encode() or not (vfl >= 4 and vfl <= self.__vfl):
                return "Invalid file type"

            log.info(["file version", vfl])

            cases = self.readCase(fs, vfl)
            with open(Path(target, "cases.bin"), "wb") as out0:
                pickle.dump(cases, out0)

            for idx, icase in enumerate(cases):
                id = icase["id"] if useID else idx
                type_of_contract = int(self.readPack("i", fs, 1))
                genConf = {
                    "type_of_contract": type_of_contract,
                    "discount_rate_start_year": self.readPack("i", fs, 0),
                    "discount_rate": self.readPack("d", fs, 0.0),
                    "inflation_rate_applied_to": self.readPack("h", fs, 0),
                    "start_date_project": self.readPack("q", fs, 0),
                    "end_date_project": self.readPack("q", fs, 0),
                    "start_date_project_second": self.readPack("q", fs, 0),
                    "end_date_project_second": self.readPack("q", fs, 0),
                    # start ver. 12
                    "delayAccMode": self.readPack("h", fs, 0) if vfl >= 12 else 0,
                    "delayAccYear": self.readPack("h", fs, 0) if vfl >= 12 else 0,
                    # start ver. 15
                    "useCOS": self.readPack("?", fs, 0) if vfl >= 15 else False,
                    # start ver. 19
                    "lbtUseCalc": self.readPack("?", fs, 0) if vfl >= 19 else False,
                }
                fiscal = {
                    "Fiskal": self.readFiscalBase(fs, vfl),
                    "Fiskal2": self.readFiscalBase(fs, vfl),
                }
                producer = self.readProducer(fs, vfl)
                contracts = self.readcontrats(type_of_contract, fs, vfl)
                tangible = self.readCosts(0, fs, vfl)
                intangible = self.readCosts(1, fs, vfl)
                opex = self.readCosts(2, fs, vfl)
                asr = self.readCosts(3, fs, vfl)

                # error! miss write in ver.14, fix on ver.15
                cos = (
                    self.readCosts(4, fs, vfl)
                    if vfl >= 15
                    else [
                        {
                            "expense_year": None,
                            "cost_allocation": None,
                            "cost": None,
                            "tax_portion": None,
                            "description": None,
                        }
                    ]
                )

                lbt = (
                    self.readCosts(5, fs, vfl)
                    if vfl >= 16
                    else [
                        {
                            "expense_year": None,
                            "cost_allocation": None,
                            "cost": None,
                            "tax_portion": None,
                            "description": None,
                            "final_year": None,
                            "utilized_land_area": None,
                            "utilized_building_area": None,
                            "njop_land": None,
                            "njop_building": None,
                            "gross_revenue": None,
                        }
                    ]
                )

                sensCfg = [80, 80]
                monteCfg = self.defMonteCfg()
                monteRes = None
                optimCfg = self.defOptimCfg()

                with open(Path(target, f"genconf_{id}.bin"), "wb") as out1:
                    pickle.dump(genConf, out1)
                with open(Path(target, f"fiscal_{id}.bin"), "wb") as out2:
                    pickle.dump(fiscal, out2)
                with open(Path(target, f"producer_{id}.bin"), "wb") as out3:
                    pickle.dump(producer, out3)
                with open(Path(target, f"contracts_{id}.bin"), "wb") as out4:
                    pickle.dump(contracts, out4)
                with open(Path(target, f"tangiblev2_{id}.bin"), "wb") as out5:
                    pickle.dump(tangible, out5)
                with open(Path(target, f"intangiblev2_{id}.bin"), "wb") as out6:
                    pickle.dump(intangible, out6)
                with open(Path(target, f"opexv2_{id}.bin"), "wb") as out7:
                    pickle.dump(opex, out7)
                with open(Path(target, f"asrv2_{id}.bin"), "wb") as out8:
                    pickle.dump(asr, out8)
                with open(Path(target, f"cosv2_{id}.bin"), "wb") as out11:
                    pickle.dump(cos, out11)
                with open(Path(target, f"lbtv2_{id}.bin"), "wb") as out12:
                    pickle.dump(lbt, out12)

            if vfl >= 5:
                # extract sens
                for idx, icase in enumerate(cases):
                    id = icase["id"] if useID else idx
                    self.extractSens(target, fs, id, True)

                # extract monte
                for idx, icase in enumerate(cases):
                    id = icase["id"] if useID else idx
                    self.extractMonte(target, fs, id, True)
                if vfl >= 6:
                    # extract optim
                    for idx, icase in enumerate(cases):
                        id = icase["id"] if useID else idx
                        self.extractOptim(target, fs, id, True)
                if vfl >= 8:
                    # extract compare
                    comp_ = self.readCompareConfig(fs)
                    with open(Path(target, "compare.bin"), "wb") as out9:
                        pickle.dump(comp_, out9)
                    # extract combine
                    comb_ = self.readCombineConfig(fs, vfl)
                    with open(Path(target, "combine2.bin"), "wb") as out10:
                        pickle.dump(comb_, out10)
                if vfl >= 17:
                    # extract incremental
                    incr_ = self.readIncrConfig(fs, vfl)
                    with open(Path(target, "incr.bin"), "wb") as out11:
                        pickle.dump(incr_, out11)

            return True

    def loadCases(self, sourcePath: Path):
        with open(Path(sourcePath, "cases.bin"), "rb") as fl:
            return pickle.load(fl)

    def loadGenConfig(self, sourcePath: Path, index: int):
        filePath = Path(sourcePath, f"genconf_{index}.bin")
        if not filePath.exists():
            raise Exception(f"genconf file for id={index} not found")
        with open(filePath, "rb") as fl:
            return pickle.load(fl)

    def loadFiscalConfig(self, sourcePath: Path, index: int):
        filePath = Path(sourcePath, f"fiscal_{index}.bin")
        if not filePath.exists():
            raise Exception(f"fiscal file for id={index} not found")
        with open(filePath, "rb") as fl:
            return pickle.load(fl)

    def loadproducer(self, sourcePath: Path, index: int):
        filePath = Path(sourcePath, f"producer_{index}.bin")
        if not filePath.exists():
            raise Exception(f"producer file for id={index} not found")
        with open(filePath, "rb") as fl:
            return pickle.load(fl)

    def loadcontracts(self, sourcePath: Path, index: int):
        filePath = Path(sourcePath, f"contracts_{index}.bin")
        if not filePath.exists():
            raise Exception(f"contract file for id={index} not found")
        with open(filePath, "rb") as fl:
            return pickle.load(fl)

    def loadCosts(self, mode: int, sourcePath: Path, index: int):
        if mode == 0:
            filePath = Path(sourcePath, f"tangiblev2_{index}.bin")
            if not filePath.exists():
                raise Exception(f"tangible file for id={index} not found")
            with open(filePath, "rb") as fl:
                return pickle.load(fl)
        elif mode == 1:
            filePath = Path(sourcePath, f"intangiblev2_{index}.bin")
            if not filePath.exists():
                raise Exception(f"intangible file for id={index} not found")
            with open(filePath, "rb") as fl:
                return pickle.load(fl)
        elif mode == 2:
            filePath = Path(sourcePath, f"opexv2_{index}.bin")
            if not filePath.exists():
                raise Exception(f"opex file for id={index} not found")
            with open(filePath, "rb") as fl:
                return pickle.load(fl)
        elif mode == 3:
            filePath = Path(sourcePath, f"asrv2_{index}.bin")
            if not filePath.exists():
                raise Exception(f"asr file for id={index} not found")
            with open(filePath, "rb") as fl:
                return pickle.load(fl)
        elif mode == 4:
            filePath = Path(sourcePath, f"cosv2_{index}.bin")
            if not filePath.exists():
                raise Exception(f"cos file for id={index} not found")
            with open(filePath, "rb") as fl:
                return pickle.load(fl)
        elif mode == 5:
            filePath = Path(sourcePath, f"lbtv2_{index}.bin")
            if not filePath.exists():
                raise Exception(f"lbt file for id={index} not found")
            with open(filePath, "rb") as fl:
                return pickle.load(fl)
        else:
            return []

    def loadsens(self, sourcePath: Path, index: int):
        filePath = Path(sourcePath, f"senscfg_{index}.bin")
        if not filePath.exists():
            return [80, 80]
        with open(filePath, "rb") as fl:
            return pickle.load(fl)

    def loadCompare(self, sourcePath: Path):
        if Path(sourcePath, "compare.bin").exists():
            with open(Path(sourcePath, "compare.bin"), "rb") as fl:
                return pickle.load(fl)
        else:
            return []

    def loadCombine(self, sourcePath: Path):
        if Path(sourcePath, "combine2.bin").exists():
            with open(Path(sourcePath, "combine2.bin"), "rb") as fl:
                return pickle.load(fl)
        else:
            return []

    def loadIncr(self, sourcePath: Path):
        if Path(sourcePath, "incr.bin").exists():
            with open(Path(sourcePath, "incr.bin"), "rb") as fl:
                return pickle.load(fl)
        else:
            return []

    def defMonteCfg(self):
        return {
            "numsim": 1000,
            "params": [
                {
                    "id": 0,
                    "dist": 2,
                    "min": None,
                    "max": None,
                    "base": None,
                    "stddev": 1.25,
                },
                {
                    "id": 1,
                    "dist": 2,
                    "min": None,
                    "max": None,
                    "base": None,
                    "stddev": 1.25,
                },
                {
                    "id": 2,
                    "dist": 2,
                    "min": None,
                    "max": None,
                    "base": None,
                    "stddev": 1.25,
                },
                {
                    "id": 3,
                    "dist": 2,
                    "min": None,
                    "max": None,
                    "base": None,
                    "stddev": 1.25,
                },
                {
                    "id": 4,
                    "dist": 2,
                    "min": None,
                    "max": None,
                    "base": None,
                    "stddev": 1.25,
                },
            ],
        }

    def readSens(self, fs: BufferedReader):
        return [self.readPack("d", fs, 80.0) for i in range(2)]

    def writeSens(self, path: Path, value: List, fsw: BufferedWriter | None = None):
        fs = fsw if fsw is not None else open(path, "ab")
        self.writePack(value[0], "d", fs)
        self.writePack(value[1], "d", fs)

    def extractSens(self, wsPath: Path, fs: BufferedReader, id: int, writeData: bool):
        sensCfg = self.readSens(fs)
        if writeData:
            with open(Path(wsPath, f"senscfg_{id}.bin"), "wb") as fw:
                pickle.dump(sensCfg, fw)

    def readMonte(self, fs: BufferedReader):
        numsim = int(self.readPack("i", fs, 1000))
        lenParams = int(self.readPack("i", fs, 0))
        if lenParams:
            montecfgs_ = {
                "numsim": numsim,
                "params": [
                    {
                        "id": self.readPack("i", fs),
                        "dist": self.readPack("h", fs),
                        "min": self.readPack("d", fs),
                        "max": self.readPack("d", fs),
                        "base": self.readPack("d", fs),
                        "stddev": self.readPack("d", fs),
                    }
                    for i in range(lenParams)
                ],
            }
            return montecfgs_
        else:
            return self.defMonteCfg()

    def writeMonte(self, path: Path, param: Any, fsw: BufferedWriter | None = None):
        fs = fsw if fsw is not None else open(path, "ab")
        self.writePack(param["numsim"], "i", fs)
        lenParams = len(param["params"])
        self.writePack(lenParams, "i", fs)
        for i, param in enumerate(param["params"]):
            self.writePack(param["id"], "i", fs)
            self.writePack(param["dist"], "h", fs)
            self.writePack(param["min"], "d", fs)
            self.writePack(param["max"], "d", fs)
            self.writePack(param["base"], "d", fs)
            self.writePack(param["stddev"], "d", fs)

    def loadmonte(self, sourcePath: Path, index: int):
        filePath = Path(sourcePath, f"montecfg_{index}.bin")
        if not filePath.exists():
            return self.defMonteCfg()
        with open(filePath, "rb") as fl:
            return pickle.load(fl)

    def loadmonteRes(self, sourcePath: Path, index: int):
        filePath = Path(sourcePath, f"monte_{index}.bin")
        if not filePath.exists():
            return {"hash": None, "result": None}
        with open(filePath, "rb") as fs:
            (lentxt,) = struct.unpack("@i", fs.read(struct.calcsize("@i")))
            if lentxt:
                (txt,) = struct.unpack(
                    f"@{lentxt}s", fs.read(struct.calcsize(f"@{lentxt}s"))
                )
                hashid = txt.decode("utf-8") if isinstance(txt, bytes) else None
                return {
                    "hash": hashid,
                    "result": pickle.load(fs) if hashid is not None else None,
                }
        return {"hash": None, "result": None}

    def readMonteRes(self, fs: BufferedReader):
        hasResult = self.readPack("?", fs, False)

        def readResult():
            results = {"params": [], "results": [], "P10": [], "P50": [], "P90": []}
            # read params
            lenParam = int(self.readPack("i", fs, 0))
            if lenParam:
                results["params"] = (
                    [self.readPack("s", fs) for i in range(lenParam)]
                    if lenParam
                    else []
                )
            # read results
            lenRows = int(self.readPack("i", fs, 0))
            if lenRows:
                lenCols = int(self.readPack("i", fs, 0))
                results["results"] = [
                    [self.readPack("d", fs) for c in range(lenCols)]
                    for r in range(lenRows)
                ]
            # read percentile
            for p in [10, 50, 90]:
                lenP = int(self.readPack("i", fs, 0))
                if lenP:
                    results[f"P{p}"] = [self.readPack("d", fs) for c in range(lenP)]

            return results

        if hasResult:
            hashid = self.readPack("s", fs)
            result = readResult() if hashid is not None else None
            return {"hash": hashid, "result": result}

        return {"hash": None, "result": None}

    def writeMonteRes(
        self, path: Path, resData: Any, fsw: BufferedWriter | None = None
    ):
        fs = fsw if fsw is not None else open(path, "ab")
        hashid = resData["hash"] if resData is not None else None
        result = resData["result"] if resData is not None else None
        # monte result
        self.writePack(True if result is not None else False, "?", fs)
        if result is not None:
            # write hash value
            self.writePack(hashid, "s", fs)
            # write params
            lenParam = len(result["params"])
            self.writePack(lenParam, "i", fs)
            if lenParam:
                for i, param in enumerate(result["params"]):
                    self.writePack(param, "s", fs)
            # write result
            lenResult = len(result["results"])
            self.writePack(lenResult, "i", fs)
            if lenResult:
                for ii, resitem in enumerate(result["results"]):
                    rows = resitem
                    if ii == 0:
                        self.writePack(len(rows), "i", fs)
                    for iii, col in enumerate(rows):
                        self.writePack(col, "d", fs)
            # write P10/P50/P90
            for p in [10, 50, 90]:
                lenP = len(result[f"P{p}"])
                self.writePack(lenP, "i", fs)
                if lenP:
                    for i, col in enumerate(result[f"P{p}"]):
                        self.writePack(col, "d", fs)

    def extractMonte(self, wsPath: Path, fs: BufferedReader, id: int, writeData: bool):
        # read monte
        monteCfg = self.readMonte(fs)
        # read monte result
        monteRes = self.readMonteRes(fs)

        if writeData:
            # save monte cfg
            with open(Path(wsPath, f"montecfg_{id}.bin"), "wb") as fw1:
                pickle.dump(monteCfg, fw1)
            # save monte result
            hash: str | None = monteRes["hash"]
            resMonte = monteRes["result"]
            if hash is not None and resMonte is not None:
                with open(Path(wsPath, f"monte_{id}.bin"), "wb") as fw2:
                    lenTxt = len(hash)
                    fw2.write(struct.pack("@i", lenTxt))
                    fw2.write(struct.pack(f"@{lenTxt}s", str(hash).encode()))
                    pickle.dump(resMonte, fw2)

    def defOptimCfg(self):
        return {
            "target_parameter": 0,
            "target_optimization": 0.0,
            "optimization": [
                {
                    "parameter": i,
                    "min": 0.3 if i in [0, 1] else 0.4 if i == 9 else 0.2,
                    "max": (
                        0.6
                        if i in [0, 1]
                        else 0.44
                        if i == 9
                        else 1.0
                        if i in [6, 7]
                        else 0.4
                    ),
                    "pos": i,
                    "checked": False,
                }
                for i in range(11)
            ],
        }

    def readOptim(self, fs: BufferedReader):
        target_parameter = int(self.readPack("h", fs, 0))
        target_optimization = self.readPack("d", fs)
        lenOpti = int(self.readPack("i", fs, 0))
        if lenOpti:
            return {
                "target_parameter": target_parameter,
                "target_optimization": target_optimization,
                "optimization": [
                    {
                        "parameter": self.readPack("h", fs),
                        "min": self.readPack("d", fs),
                        "max": self.readPack("d", fs),
                        "pos": self.readPack("h", fs),
                        "checked": self.readPack("?", fs),
                    }
                    for i in range(lenOpti)
                ],
            }
        else:
            return self.defOptimCfg()

    def writeOptim(self, path: Path, param: Any, fsw: BufferedWriter | None = None):
        fs = fsw if fsw is not None else open(path, "ab")
        self.writePack(param["target_parameter"], "h", fs)
        self.writePack(param["target_optimization"], "d", fs)
        lenOpti = len(param["optimization"])
        self.writePack(lenOpti, "i", fs)
        for i, param in enumerate(param["optimization"]):
            self.writePack(param["parameter"], "h", fs)
            self.writePack(param["min"], "d", fs)
            self.writePack(param["max"], "d", fs)
            self.writePack(param["pos"], "h", fs)
            self.writePack(param["checked"], "?", fs)

    def loadoptim(self, sourcePath: Path, index: int):
        filePath = Path(sourcePath, f"optimcfg_{index}.bin")
        if not filePath.exists():
            return self.defOptimCfg()
        with open(filePath, "rb") as fl:
            return pickle.load(fl)

    def extractOptim(self, wsPath: Path, fs: BufferedReader, id: int, writeData: bool):
        # read optim
        optimCfg = self.readOptim(fs)
        if writeData:
            # save optim cfg
            with open(Path(wsPath, f"optimcfg_{id}.bin"), "wb") as fw1:
                pickle.dump(optimCfg, fw1)

    def extractProject(self, filePath: Path, oldWSPath: str | None, newWSPath: str):
        owsPath: Path | None = (
            None if oldWSPath is None else Path(self.root_path, "~tmp", f"{oldWSPath}")
        )
        wsPath: Path = Path(self.root_path, "~tmp", f"{newWSPath}")
        result = "Path not found"
        if filePath.exists():
            if not wsPath.exists():
                os.makedirs(name=wsPath, exist_ok=True)
            # extract data to temp path
            result = self.ExtractFile(filePath, wsPath, True)
        # remove old temp data
        if isinstance(owsPath, Path) and owsPath.exists():
            shutil.rmtree(str(owsPath), ignore_errors=True, onerror=None)
        return result

    def cloneCase(
        self, wspath: str, sourceid: int, targetid: int, ctrType: int, typechg: bool
    ):
        def clonefile(tmpPath: Path, flnm: str):
            try:
                sourcePath = Path(tmpPath, f"{flnm}_{sourceid}.bin")
                targetPath = Path(tmpPath, f"{flnm}_{targetid}.bin")
                if sourcePath.exists():
                    shutil.copyfile(str(sourcePath), str(targetPath))
            except Exception:
                pass

        tmpPath = Path(self.root_path, "~tmp", f"{wspath}")
        if typechg:
            try:
                genconf = self.loadGenConfig(tmpPath, sourceid)
                genconf["type_of_contract"] = ctrType
                with open(Path(tmpPath, f"genconf_{targetid}.bin"), "wb") as out1:
                    pickle.dump(genconf, out1)
            except Exception:
                pass
        else:
            clonefile(tmpPath, "genconf")
        clonefile(tmpPath, "fiscal")
        clonefile(tmpPath, "producer")
        if typechg:
            try:
                contracts = self.loadcontracts(tmpPath, sourceid)
                if ctrType >= 3:
                    if ctrType in [3, 6]:
                        if (
                            contracts["second"] is None
                            or "oil_ftp" not in contracts["second"]
                        ):
                            contracts["second"] = contracts["cr"]
                    elif ctrType in [4, 5]:
                        if (
                            contracts["second"] is None
                            or "field_status" not in contracts["second"]
                        ):
                            contracts["second"] = contracts["gs"]
                elif contracts["second"] is not None:
                    if "oil_ftp" in contracts["second"] and ctrType not in [3, 4]:
                        contracts["cr"] = contracts["second"]
                    elif "field_status" in contracts["second"] and ctrType not in [
                        5,
                        6,
                    ]:
                        contracts["gs"] = contracts["second"]
                    contracts["second"] = None
                with open(Path(tmpPath, f"contracts_{targetid}.bin"), "wb") as out2:
                    pickle.dump(contracts, out2)
            except Exception:
                pass
        else:
            clonefile(tmpPath, "contracts")
        clonefile(tmpPath, "tangiblev2")
        clonefile(tmpPath, "intangiblev2")
        clonefile(tmpPath, "opexv2")
        clonefile(tmpPath, "asrv2")
        clonefile(tmpPath, "cosv2")
        clonefile(tmpPath, "lbtv2")
        if not typechg:
            clonefile(tmpPath, "senscfg")
            clonefile(tmpPath, "montecfg")
            clonefile(tmpPath, "monte")
            clonefile(tmpPath, "optimcfg")

    def chgCtrType(self, wspath: str, sourceid: int, oldCtrType: int, newCtrType: int):
        tmpPath = Path(self.root_path, "~tmp", f"{wspath}")
        try:
            genconf = self.loadGenConfig(tmpPath, sourceid)
            genconf["type_of_contract"] = newCtrType
            with open(Path(tmpPath, f"genconf_{sourceid}.bin"), "wb") as out1:
                pickle.dump(genconf, out1)
        except Exception:
            pass
        try:
            contracts = self.loadcontracts(tmpPath, sourceid)
            if newCtrType >= 3:
                if newCtrType in [3, 6]:
                    if (
                        contracts["second"] is None
                        or "oil_ftp" not in contracts["second"]
                    ):
                        contracts["second"] = contracts["cr"]
                elif newCtrType in [4, 5]:
                    if (
                        contracts["second"] is None
                        or "field_status" not in contracts["second"]
                    ):
                        contracts["second"] = contracts["gs"]
            elif contracts["second"] is not None:
                if "oil_ftp" in contracts["second"] and newCtrType not in [3, 4]:
                    contracts["cr"] = contracts["second"]
                elif "field_status" in contracts["second"] and newCtrType not in [
                    5,
                    6,
                ]:
                    contracts["gs"] = contracts["second"]
                contracts["second"] = None
            with open(Path(tmpPath, f"contracts_{sourceid}.bin"), "wb") as out2:
                pickle.dump(contracts, out2)
        except Exception:
            pass

    def readCompareConfig(self, fs: BufferedReader):
        def getiComp():
            lenicomp = int(self.readPack("i", fs, 0))
            return [self.readPack("i", fs, 0) for ic in range(lenicomp)]

        lencompare = int(self.readPack("i", fs, 0))
        return [
            {"source": self.readPack("i", fs, 0), "comp": getiComp()}
            for i in range(lencompare)
        ]

    def readCombineConfig(self, fs: BufferedReader, vfl: int):
        def getiComb():
            lenicomb = int(self.readPack("i", fs, 0))
            return [self.readPack("i", fs, 0) for ic in range(lenicomb)]

        lencomb = int(self.readPack("i", fs, 0))
        return [
            {
                "source": self.readPack("i", fs, 0),
                "comp": getiComb(),
                "inflation_rate": self.readPack("d", fs, 0.0) if vfl >= 9 else 0.0,
                "discount_rate": self.readPack("d", fs, 0.1) if vfl >= 9 else 0.1,
                "reference_year": self.readPack("i", fs, 0) if vfl >= 9 else 0,
                "npv_mode": self.readPack("h", fs, 3) if vfl >= 9 else 3,
                "discounting_mode": self.readPack("h", fs, 0) if vfl >= 9 else 0,
            }
            for i in range(lencomb)
        ]

    def readIncrConfig(self, fs: BufferedReader, vfl: int):
        lenincr = int(self.readPack("i", fs, 0))
        return [
            {
                "source": self.readPack("i", fs, 0),
                "comp": self.readPack("i", fs, 0),
                "inflation_rate": self.readPack("d", fs, 0.0) if vfl >= 9 else 0.0,
                "discount_rate": self.readPack("d", fs, 0.1) if vfl >= 9 else 0.1,
                "reference_year": self.readPack("i", fs, 0) if vfl >= 9 else 0,
                "npv_mode": self.readPack("h", fs, 3) if vfl >= 9 else 3,
                "discounting_mode": self.readPack("h", fs, 0) if vfl >= 9 else 0,
            }
            for i in range(lenincr)
        ]

    def writeCompareConf(
        self, path: Path | None, value: List, fs: BufferedWriter | None = None
    ):
        if path is not None:
            filePath = Path(path, "compare.bin")
            out0 = open(filePath, "wb")
            pickle.dump(value, out0)
        elif fs is not None:
            llist: int = len(value)
            self.writePack(llist, "i", fs)
            for i, ilist in enumerate(value):
                self.writePack(ilist["source"], "i", fs)
                lcomp: int = len(ilist["comp"])
                self.writePack(lcomp, "i", fs)
                for ii, icomp in enumerate(ilist["comp"]):
                    self.writePack(icomp, "i", fs)

    def writeCombineConf(
        self, path: Path | None, value: List, fs: BufferedWriter | None
    ):
        if path is not None:
            filePath = Path(path, "combine2.bin")
            out0 = open(filePath, "wb")
            pickle.dump(value, out0)
        elif fs is not None:
            llist: int = len(value)
            self.writePack(llist, "i", fs)
            for i, ilist in enumerate(value):
                self.writePack(ilist["source"], "i", fs)
                lcomb: int = len(ilist["comp"])
                self.writePack(lcomb, "i", fs)
                for ii, icomb in enumerate(ilist["comp"]):
                    self.writePack(icomb, "i", fs)
                self.writePack(ilist["inflation_rate"], "d", fs)
                self.writePack(ilist["discount_rate"], "d", fs)
                self.writePack(ilist["reference_year"], "i", fs)
                self.writePack(ilist["npv_mode"], "h", fs)
                self.writePack(ilist["discounting_mode"], "h", fs)

    def writeIncrConf(self, path: Path | None, value: List, fs: BufferedWriter | None):
        if path is not None:
            filePath = Path(path, "incr.bin")
            out0 = open(filePath, "wb")
            pickle.dump(value, out0)
        elif fs is not None:
            llist: int = len(value)
            self.writePack(llist, "i", fs)
            for i, ilist in enumerate(value):
                self.writePack(ilist["source"], "i", fs)
                self.writePack(ilist["comp"], "i", fs)
                self.writePack(ilist["inflation_rate"], "d", fs)
                self.writePack(ilist["discount_rate"], "d", fs)
                self.writePack(ilist["reference_year"], "i", fs)
                self.writePack(ilist["npv_mode"], "h", fs)
                self.writePack(ilist["discounting_mode"], "h", fs)
