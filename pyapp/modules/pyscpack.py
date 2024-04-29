import logging
import math
import pickle
import struct
from io import BufferedReader, BufferedWriter
from pathlib import Path
from typing import Any, List

import numpy as np

log = logging.getLogger("uvicorn")


class pyscPacker:
    __hfl: str = "pySCapp"
    __vfl: int = 4  # ver.3: var add sign (1 byte) for Null int
    # ver.4: add case data

    def __init__(self, path: Path | None = None):
        if path:
            with open(path, "wb") as fs:
                # write header
                fs.write(struct.pack("@7si", self.__hfl.encode(), self.__vfl))
                fs.close()

    def isValidFileHeader(self, path: Path):
        with open(path, "rb") as fs:
            hfl, vfl = struct.unpack("@7si", fs.read(struct.calcsize("@7si")))
            return hfl == self.__hfl.encode() and vfl == self.__vfl

    def writeCase(self, path: Path, value: List):
        lcase: int = len(value)
        with open(path, "ab") as fs:
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

    def readCase(self, fs: BufferedReader):
        lencase = int(self.readPack("i", fs, 0))

        def getiCase():
            id = self.readPack("i", fs, 0)
            name = self.readPack("s", fs)
            description = self.readPack("s", fs)
            type = self.readPack("h", fs)
            updated_at = self.readPack("q", fs)
            lidcase = int(self.readPack("i", fs))
            return {
                "id": id,
                "name": name,
                "description": description,
                "type": type,
                "updated_at": updated_at,
                "multicase": (
                    []
                    if type != -1 or lidcase == 0
                    else [self.readPack("i", fs) for ii in range(lidcase)]
                ),
            }

        return [getiCase() for i in range(lencase)]

    def writeGenConfig(self, path: Path, value: dict):
        with open(path, "ab") as fs:
            self.writePack(value["type_of_contract"], "i", fs)
            self.writePack(value["discount_rate_start_year"], "i", fs)
            self.writePack(value["discount_rate"], "d", fs)
            self.writePack(value["inflation_rate_applied_to"], "h", fs)
            self.writePack(value["start_date_project"], "q", fs)
            self.writePack(value["end_date_project"], "q", fs)
            self.writePack(value["start_date_project_second"] | 0, "q", fs)
            self.writePack(value["end_date_project_second"] | 0, "q", fs)
            fs.close()

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

    def readTable(self, fmtType: dict | List, fs: BufferedReader):
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
                    {self.readPack(getfmt(ii), fs) for ii in range(cols)}
                    for i in range(lenTable)
                ]

        return False

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

    def readFiscalBase(self, fs: BufferedReader) -> dict:
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

    def readcostRecConfig(self, fs: BufferedReader):
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

        return {
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

    def readgsConfig(self, fs: BufferedReader):
        return {
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
        }

    def writeFiscalConfig(self, path: Path, value: dict):
        with open(path, "ab") as fs:
            self.writeFiscalBase(value["Fiskal"], fs)
            self.writeFiscalBase(value["Fiskal2"], fs)
            fs.close()

    def writeProducer(self, path: Path, value: dict):
        with open(path, "ab") as fs:
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
                    else:
                        self.writeTable(prodItem, ["i", "d"], fs)

    def readProducer(self, fs: BufferedReader):
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
                    {
                        "year": "i",
                        "sales": "d",
                        "price": "d",
                        "condensate_sales": "d",
                        "condensate_price": "d",
                    },
                    fs,
                )
            elif tipeProd == 1:  # Gas Producer
                len_iTable = int(self.readPack("i", fs, 0))
                return [
                    {
                        "year": self.readPack("i", fs),
                        "production": self.readPack("d", fs),
                        "gsa": readGSA(),
                    }
                    for i in range(len_iTable)
                ]
            else:
                return self.readTable({"year": "i", "sales": "d", "price": "d"}, fs)

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
                                }
                            ]
                        )
                    else:
                        TableProdPrice.append(
                            [{"year": None, "sales": None, "price": None}]
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

    def writecontrats(self, path: Path, tipe: int, value: dict):
        with open(path, "ab") as fs:
            self.writecostRecConfig(value["cr"], fs)
            self.writegsConfig(value["gs"], fs)
            if tipe >= 3:
                (
                    self.writecostRecConfig(value["second"], fs)
                    if tipe in [3, 6]
                    else self.writegsConfig(value["second"], fs)
                )

    def readcontrats(self, tipe: int, fs: BufferedReader):
        result = {
            "cr": self.readcostRecConfig(fs),
            "gs": self.readgsConfig(fs),
            "second": None,
        }
        if tipe >= 3:
            result.update(
                {"second": self.readcostRecConfig(fs)}
                if tipe in [3, 6]
                else {"second": self.readgsConfig(fs)}
            )
        return result

    def writeCosts(self, path: Path, mode: int, value: List):
        with open(path, "ab") as fs:
            fmt = ["d"]
            if mode == 0:  # tangible
                fmt = ["i", "h", "d", "i", "i", "d", "h", "d", "s"]
            elif mode == 1:  # intangible
                fmt = ["i", "h", "d", "d", "s"]
            elif mode == 2:  # opex
                fmt = ["i", "h", "d", "d", "d", "d", "d", "s"]
            elif mode == 3:  # asr
                fmt = ["i", "h", "d", "s"]
            self.writeTable(value, fmt, fs)

    def readCosts(self, mode: int, fs: BufferedReader):
        def readTableList(fmt: List) -> List[Any]:
            def extractRows(index: int, ifmt: str):
                val = self.readPack(ifmt, fs)
                if index == 1 and val is not None:
                    return "Gas" if val == 1 else "Oil"
                elif mode == 0 and index == 6 and val is not None:
                    return "Yes" if val == 1 else "No"
                return val

            lenTable = int(self.readPack("i", fs, 0))
            if lenTable > 0:
                cols = self.readPack("i", fs, 0)
                return [
                    [extractRows(ii, ifmt) for ii, ifmt in enumerate(fmt)]
                    for i in range(lenTable)
                ]
            else:
                return [[None] * len(fmt)]

        fmt = ["d"]
        if mode == 0:  # tangible
            fmt = ["i", "h", "d", "i", "i", "d", "h", "d", "s"]
        elif mode == 1:  # intangible
            fmt = ["i", "h", "d", "d", "s"]
        elif mode == 2:  # opex
            fmt = ["i", "h", "d", "d", "d", "d", "d", "s"]
        elif mode == 3:  # asr
            fmt = ["i", "h", "d", "s"]
        return readTableList(fmt)

    def ExtractFile(self, source: Path, target: Path):
        with open(source, "rb") as fs:
            hfl, vfl = struct.unpack("@7si", fs.read(struct.calcsize("@7si")))

            cases = self.readCase(fs)
            with open(str(target) + "\\cases.bin", "wb") as out0:
                pickle.dump(cases, out0)

            for idx, icase in enumerate(cases):
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
                }
                fiscal = {
                    "Fiskal": self.readFiscalBase(fs),
                    "Fiskal2": self.readFiscalBase(fs),
                }
                producer = self.readProducer(fs)
                contracts = self.readcontrats(type_of_contract, fs)
                tangible = self.readCosts(0, fs)
                intangible = self.readCosts(1, fs)
                opex = self.readCosts(2, fs)
                asr = self.readCosts(3, fs)
                with open(str(target) + f"\\genconf_{idx}.bin", "wb") as out1:
                    pickle.dump(genConf, out1)
                with open(str(target) + f"\\fiscal_{idx}.bin", "wb") as out2:
                    pickle.dump(fiscal, out2)
                with open(str(target) + f"\\producer_{idx}.bin", "wb") as out3:
                    pickle.dump(producer, out3)
                with open(str(target) + f"\\contracts_{idx}.bin", "wb") as out4:
                    pickle.dump(contracts, out4)
                with open(str(target) + f"\\tangible_{idx}.bin", "wb") as out5:
                    pickle.dump(tangible, out5)
                with open(str(target) + f"\\intangible_{idx}.bin", "wb") as out6:
                    pickle.dump(intangible, out6)
                with open(str(target) + f"\\opex_{idx}.bin", "wb") as out7:
                    pickle.dump(opex, out7)
                with open(str(target) + f"\\asr_{idx}.bin", "wb") as out8:
                    pickle.dump(asr, out8)

    def loadCases(self, sourcePath: Path):
        with open(str(sourcePath) + "\\cases.bin", "rb") as fl:
            return pickle.load(fl)

    def loadGenConfig(self, sourcePath: Path, index: int):
        with open(str(sourcePath) + f"\\genconf_{index}.bin", "rb") as fl:
            return pickle.load(fl)

    def loadFiscalConfig(self, sourcePath: Path, index: int):
        with open(str(sourcePath) + f"\\fiscal_{index}.bin", "rb") as fl:
            return pickle.load(fl)

    def loadproducer(self, sourcePath: Path, index: int):
        with open(str(sourcePath) + f"\\producer_{index}.bin", "rb") as fl:
            return pickle.load(fl)

    def loadcontracts(self, sourcePath: Path, index: int):
        with open(str(sourcePath) + f"\\contracts_{index}.bin", "rb") as fl:
            return pickle.load(fl)

    def loadCosts(self, mode: int, sourcePath: Path, index: int):
        if mode == 0:
            with open(str(sourcePath) + f"\\tangible_{index}.bin", "rb") as fl:
                return pickle.load(fl)
        elif mode == 1:
            with open(str(sourcePath) + f"\\intangible_{index}.bin", "rb") as fl:
                return pickle.load(fl)
        elif mode == 2:
            with open(str(sourcePath) + f"\\opex_{index}.bin", "rb") as fl:
                return pickle.load(fl)
        elif mode == 3:
            with open(str(sourcePath) + f"\\asr_{index}.bin", "rb") as fl:
                return pickle.load(fl)
        else:
            return []
