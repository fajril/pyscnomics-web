import base64
import json
import logging
import os
import random
import shutil
import string
import struct
from distutils.sysconfig import EXEC_PREFIX
from pathlib import Path
from typing import Any

# from sqlalchemy.orm import Session
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status

# from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from pyapp.modules.filebrowser import list_drives, list_files
from pyapp.modules.monte import ProcessMonte
from pyapp.modules.sens import ProcessSens
from pyapp.shemas import TableRequest
from pyapp.shemas.project import ProjectCreate, ProjectUpdate
from pyscnomics.api.adapter import (
    get_contract_optimization,
    get_contract_table,
    get_costrecovery,
    get_grosssplit,
    get_transition,
)

from ..crud.project import (
    create_project,
    get_projects,
    update_project,
)
from ..database.db import get_async_session
from ..database.projdb import make_proj_db_and_tables
from ..models.project import Project
from ..modules.lzstring import LZString
from ..modules.pyscpack import pyscPacker

log = logging.getLogger("uvicorn")

routerapi = APIRouter(prefix="/auth", tags=["webapi"])


@routerapi.get("/mydirs", response_class=JSONResponse)
async def read_dirs(flext: str, root: str = None):
    if root:
        pathname: str = base64.b64decode(root).decode("utf-8")
        if pathname != "__local__":
            return (
                list_files(flext, Path(pathname))
                if pathname != "__drive__"
                else list_drives()
            )
    return list_files(
        flext, Path(str(Path(__file__).parent.parent.parent) + "\\Samples")
    )


@routerapi.get("/cbprojects", response_class=JSONResponse)
async def getcbProjectData(db: AsyncSession = Depends(get_async_session)):
    projects = await get_projects(db, TableRequest(page=0, itemsPerPage=-1, sortBy=[]))
    return [{"title": proj.name, "value": proj.id} for proj in projects.get("list")]


@routerapi.get("/projects", response_class=JSONResponse)
async def getProjectData(q: str, db: AsyncSession = Depends(get_async_session)):
    dataStr = json.loads(base64.b64decode(q).decode("utf-8"))
    return await get_projects(db, TableRequest(**dataStr))


@routerapi.post("/update_projects", response_class=JSONResponse)
async def updProjectData(data: str, db: AsyncSession = Depends(get_async_session)):
    dataStr = json.loads(base64.b64decode(data).decode("utf-8"))
    try:
        if not await update_project(db, ProjectUpdate(**dataStr)):
            res = await create_project(db=db, proj=ProjectCreate(**dataStr))
        # create DB
        path: str = dataStr.get("path")
        if not Path(path).exists():
            # create DB
            await make_proj_db_and_tables(path)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=r"Error while updating data",
        )
    return {"state": True}


@routerapi.post("/initflproject", response_class=JSONResponse)
async def initfileb_project(path: str):
    pathFile = base64.b64decode(path).decode("utf-8")
    pyscPacker(Path(pathFile))
    return {"state": True}


@routerapi.post("/wrtcases", response_class=JSONResponse)
async def wrt_cases(path: str, gc: str):
    pathFile = base64.b64decode(path).decode("utf-8")
    data = json.loads(base64.b64decode(gc).decode("utf-8"))
    packer = pyscPacker()
    packer.writeCase(Path(pathFile), data)
    return {"state": True}


@routerapi.post("/wrtgenconf", response_class=JSONResponse)
async def wrt_genconf(path: str, gc: str):
    pathFile = base64.b64decode(path).decode("utf-8")
    data = json.loads(base64.b64decode(gc).decode("utf-8"))
    packer = pyscPacker()
    packer.writeGenConfig(Path(pathFile), data)
    return {"state": True}


@routerapi.post("/wrtfiscalconf", response_class=JSONResponse)
async def wrt_fiscalconf(path: str, gc: str):
    pathFile = base64.b64decode(path).decode("utf-8")
    data = json.loads(base64.b64decode(gc).decode("utf-8"))
    packer = pyscPacker()
    packer.writeFiscalConfig(Path(pathFile), data)
    return {"state": True}


@routerapi.post("/wrtproducer", response_class=JSONResponse)
async def wrt_producer(path: str, gc: str):
    pathFile = base64.b64decode(path).decode("utf-8")
    data = json.loads(base64.b64decode(gc).decode("utf-8"))
    packer = pyscPacker()
    packer.writeProducer(Path(pathFile), data)
    return {"state": True}


@routerapi.post("/wrtcontract", response_class=JSONResponse)
async def wrt_contract(path: str, tipe: int, gc: str):
    pathFile = base64.b64decode(path).decode("utf-8")
    data = json.loads(base64.b64decode(gc).decode("utf-8"))
    packer = pyscPacker()
    packer.writecontrats(Path(pathFile), tipe, data)
    return {"state": True}


@routerapi.post("/wrtcost", response_class=JSONResponse)
async def wrt_tangible(path: str, mode: int, gc: str):
    pathFile = base64.b64decode(path).decode("utf-8")
    data = json.loads(base64.b64decode(gc).decode("utf-8"))
    packer = pyscPacker()
    packer.writeCosts(Path(pathFile), mode, data)
    return {"state": True}


@routerapi.get("/chkheaderfile", response_class=JSONResponse)
async def chkfileproj(path: str):
    pathFile = Path(base64.b64decode(path).decode("utf-8"))
    if pathFile.exists():
        packer = pyscPacker()
        if packer.isValidFileHeader(pathFile):
            letters = string.ascii_lowercase
            pathWS = "".join(random.choice(letters) for _ in range(8))
            tmpPath = str(Path(__file__).parent.parent.parent) + f"\\~tmp\\{pathWS}"
            if not os.path.exists(tmpPath):
                os.makedirs(tmpPath)
            if not os.path.exists(tmpPath):
                return {"state": False}
            b64tmpPath = base64.b64encode(tmpPath.encode())
            packer.ExtractFile(pathFile, Path(tmpPath))
            return {"state": True, "path": b64tmpPath}
    return {"state": False}


@routerapi.get("/getcases", response_class=JSONResponse)
async def chkfileprojheader(path: str):
    try:
        pathFile = Path(base64.b64decode(path).decode("utf-8"))
        if pathFile.exists():
            packer = pyscPacker()
            if packer.isValidFileHeader(pathFile):
                return {"state": True, "cases": packer.getCases(pathFile)}
        return {"state": False}
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/importcase", response_class=JSONResponse)
async def importcase(data: str):
    try:
        dataJson = base64.b64decode(data).decode("utf-8")
        json_dict: dict = json.loads(dataJson)
        pathFile = Path(json_dict["path"])
        caseID = json_dict["caseid"]
        packer = pyscPacker()
        resImport = packer.importCase(pathFile, caseID)
        return {
            "state": True if isinstance(resImport, str) else False,
            "path": (
                base64.b64encode(resImport.encode())
                if isinstance(resImport, str)
                else None
            ),
        }
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdcases", response_class=JSONResponse)
async def rdCases(tmppath: str):
    pathFile = Path(base64.b64decode(tmppath).decode("utf-8"))
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadCases(pathFile)}
    return {"state": False}


@routerapi.get("/rdgenconf", response_class=JSONResponse)
async def rdgenConfig(tmppath: str, index: int):
    pathFile = Path(base64.b64decode(tmppath).decode("utf-8"))
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadGenConfig(pathFile, index)}
    return {"state": False}


@routerapi.get("/rdfiscalconf", response_class=JSONResponse)
async def rdfiscalconf(tmppath: str, index: int):
    pathFile = Path(base64.b64decode(tmppath).decode("utf-8"))
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadFiscalConfig(pathFile, index)}
    return {"state": False}


@routerapi.get("/rdproducer", response_class=JSONResponse)
async def rdproducer(tmppath: str, index: int):
    pathFile = Path(base64.b64decode(tmppath).decode("utf-8"))
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadproducer(pathFile, index)}
    return {"state": False}


@routerapi.get("/rdcontracts", response_class=JSONResponse)
async def rdcontracts(tmppath: str, index: int):
    pathFile = Path(base64.b64decode(tmppath).decode("utf-8"))
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadcontracts(pathFile, index)}
    return {"state": False}


@routerapi.get("/rdcosts", response_class=JSONResponse)
async def rdcosts(tmppath: str, mode: int, index: int):
    pathFile = Path(base64.b64decode(tmppath).decode("utf-8"))
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadCosts(mode, pathFile, index)}
    return {"state": False}


@routerapi.get("/closeddata", response_class=JSONResponse)
async def closeddata(tmppath: str):
    pathFile = Path(base64.b64decode(tmppath).decode("utf-8"))
    if pathFile.exists():
        shutil.rmtree(str(pathFile), ignore_errors=True, onerror=None)
    return {"state": False}


@routerapi.get("/calc_ext_summ")
async def calc_ext_summ(type: int, data: str):
    dataJson = base64.b64decode(data).decode("utf-8")
    json_dict: dict = json.loads(dataJson)
    crtable = None
    DYear = []
    ProdO = []
    CummProdO = []
    ProdG = []
    CummProdG = []
    revenue = []
    Investment = []
    Expenses = []
    tax = []
    pie = {"gs": 0, "ncs": 0, "CR": 0, "DMO": 0, "Tax": 0}
    try:
        if type == 1:
            crtable = get_contract_table(data=json_dict, contract_type="Cost Recovery")
        elif type == 2:
            crtable = get_contract_table(data=json_dict, contract_type="Gross Split")
        elif type >= 3:
            crtable = get_contract_table(data=json_dict, contract_type="Transition")
        # get get
        for i in range(2 if type >= 3 else 1):
            icrTable = crtable if type < 3 else crtable[f"contract_{i+1}"]
            # log.info(icrTable["oil"].keys())
            Olifting = icrTable["oil"][
                (
                    "lifting"
                    if type == 2
                    or (type in [4, 5] and i == 1)
                    or (type in [5, 6] and i == 0)
                    else "Lifting"
                )
            ]
            Glifting = icrTable["gas"]["Lifting"]
            DYear = list(Olifting.keys())
            ProdO = (
                (np.array(ProdO) + np.array(list(Olifting.values()))).tolist()
                if type >= 3 and i == 1
                else list(Olifting.values())
            )
            CummProdO = np.cumsum(np.array(ProdO)).tolist()
            ProdG = list(Glifting.values())
            CummProdG = np.cumsum(np.array(ProdG)).tolist()
            irevenue = (
                np.array(list(icrTable["oil"]["Revenue"].values()))
                + np.array(list(icrTable["gas"]["Revenue"].values()))
            ).tolist()
            revenue = (
                irevenue
                if i == 0
                else (np.array(revenue) + np.array(irevenue)).tolist()
            )
            iInvestment = (
                np.array(list(icrTable["oil"]["Depreciable"].values()))
                + np.array(list(icrTable["oil"]["Intangible"].values()))
                + np.array(list(icrTable["gas"]["Depreciable"].values()))
                + np.array(list(icrTable["gas"]["Intangible"].values()))
            ).tolist()
            Investment = (
                iInvestment
                if i == 0
                else (np.array(Investment) + np.array(iInvestment)).tolist()
            )
            iExpenses = (
                np.array(Investment)
                + np.array(list(icrTable["oil"]["Opex"].values()))
                + np.array(list(icrTable["gas"]["Opex"].values()))
                # np.array(list(crtable["oil"]["Total_Expenses"].values()))
                # + np.array(list(crtable["gas"]["Total_Expenses"].values()))
                # if type == 2
                # else (
                #     # np.array(list(crtable["oil"]["Opex"].values()))
                #     # + np.array(list(crtable["gas"]["Opex"].values()))
                #     # + np.array(list(crtable["oil"]["ASR"].values()))
                #     # + np.array(list(crtable["gas"]["ASR"].values()))
                # )
            ).tolist()
            Expenses = (
                iExpenses
                if i == 0
                else (np.array(Expenses) + np.array(iExpenses)).tolist()
            )
            itax = (
                np.array(
                    list(
                        icrTable["oil"][
                            (
                                "Tax_Payment"
                                if (type in [1, 3, 4] and i == 0)
                                or (type in [3, 6] and i == 0)
                                else "Tax"
                            )
                        ].values()
                    )
                )
                + np.array(
                    list(
                        icrTable["gas"][
                            (
                                "Tax_Payment"
                                if (type in [1, 3, 4] and i == 0)
                                or (type in [3, 6] and i == 0)
                                else "Tax"
                            )
                        ].values()
                    )
                )
            ).tolist()
            tax = itax if i == 0 else (np.array(tax) + np.array(itax)).tolist()

            # log.info(crtable["oil"].keys())
            # log.info(crtable["gas"].keys())
            # log.info(crtable["consolidated"].keys())
            pie["gs"] += (
                np.array(list(icrTable["oil"]["Government_Share"].values())).sum()
                + np.array(list(icrTable["gas"]["Government_Share"].values())).sum()
            )
            pie["ncs"] += (
                np.array(
                    list(
                        icrTable["oil"][
                            (
                                "Net_CTR_Share"
                                if (type in [4, 5] and i == 1)
                                or (type in [2, 5, 6] and i == 0)
                                else "Contractor_Net_Share"
                            )
                            # "Contractor_Share" if type == 2 else "Contractor_Share"
                        ].values()
                    )
                ).sum()
                + np.array(
                    list(
                        icrTable["gas"][
                            # "Net_CTR_Share" if type == 2 else "Contractor_Net_Share"
                            (
                                "Contractor_Share"
                                if (type in [4, 5] and i == 1)
                                or (type in [2, 5, 6] and i == 0)
                                else "Contractor_Share"
                            )
                        ].values()
                    )
                ).sum()
            )
            pie["CR"] += (
                0
                if (type in [4, 5] and i == 1) or (type in [2, 5, 6] and i == 0)
                else (
                    np.array(list(icrTable["oil"]["Cost_Recovery"].values())).sum()
                    + np.array(list(icrTable["gas"]["Cost_Recovery"].values())).sum()
                )
            )
            pie["DMO"] += (
                np.array(list(icrTable["oil"]["DMO_Fee"].values())).sum()
                + np.array(list(icrTable["gas"]["DMO_Fee"].values())).sum()
            )
            pie["Tax"] += (
                np.array(list(icrTable["oil"]["Taxable_Income"].values())).sum()
                + np.array(list(icrTable["gas"]["Taxable_Income"].values())).sum()
            )
    except Exception as err:
        icrTable = None
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )

    return {
        "card": {
            "year": DYear,
            "Oil": {"table": [ProdO, CummProdO], "sum": np.array(ProdO).sum()},
            "Gas": {"table": [ProdG, CummProdG], "sum": np.array(ProdG).sum()},
            "Revenue": {
                "table": [revenue, np.cumsum(np.array(revenue)).tolist()],
                "sum": np.array(revenue).sum(),
            },
            "Investment": {
                "table": [Investment, np.cumsum(np.array(Investment)).tolist()],
                "sum": np.array(Investment).sum(),
            },
            "Expenses": {
                "table": [Expenses, np.cumsum(np.array(Expenses)).tolist()],
                "sum": np.array(Expenses).sum(),
            },
            "Tax": {
                "table": [tax, np.cumsum(np.array(tax)).tolist()],
                "sum": np.array(tax).sum(),
            },
            "pie": {
                "table": pie,
                "sum": pie["gs"] + pie["ncs"] + pie["CR"] + pie["DMO"] + pie["Tax"],
            },
        },
        "summary": (
            get_costrecovery(data=json_dict)[0]
            if type == 1
            else (
                get_grosssplit(data=json_dict)[0]
                if type == 2
                else get_transition(data=json_dict)[0] if type >= 3 else []
            )
        ),
    }


@routerapi.get("/calc_cf")
async def calc_cf(type: int, data: str):
    dataJson = base64.b64decode(data).decode("utf-8")
    json_dict: dict = json.loads(dataJson)
    try:
        if type == 1:
            return get_contract_table(data=json_dict, contract_type="Cost Recovery")
        elif type == 2:
            return get_contract_table(data=json_dict, contract_type="Gross Split")
        elif type >= 3:
            return get_contract_table(data=json_dict, contract_type="Transition")
        else:
            return []
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/calc_sens")
async def calc_sens(type: int, data: str):
    dataJson = base64.b64decode(data).decode("utf-8")
    json_dict: dict = json.loads(dataJson)
    try:
        SensTask = ProcessSens(
            type,
            json_dict["contract"],
            json_dict["parameter"],
            json_dict["config"]["min"],
            json_dict["config"]["max"],
        )
        output = SensTask.Run()
        return output
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/calc_monte")
async def calc_monte(type: int, id: int, data: str):
    dataJson = base64.b64decode(data).decode("utf-8")
    json_dict: dict = json.loads(dataJson)
    try:
        ProcessMonte(
            type, id, json_dict["contract"], json_dict["numsim"], json_dict["parameter"]
        ).run()
        return {"state": "running"}
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )
