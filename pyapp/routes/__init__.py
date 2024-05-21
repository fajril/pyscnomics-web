import base64
import json
import logging
import os
import pickle
import random
import select
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
from ..modules.summaries import Summaries

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
            # return list_files(flext, Path(pathname))
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


@routerapi.get("/fileinfo", response_class=JSONResponse)
async def fileinfo(path: str | None, wspath: str):
    try:
        pathFile = base64.b64decode(path).decode("utf-8") if path is not None else None
        tmpWSPath = Path(str(Path(__file__).parent.parent.parent), f"~tmp/{wspath}")
        # get environtment
        FasAPIEnvCfg = Path(
            str(Path(__file__).parent.parent.parent),
            "fastapi-env/pyvenv.cfg",  # "velz-vue-env/pyvenv.cfg"
        )
        retValue = {
            "filepath": "Unsaved file (newfile)" if pathFile is None else pathFile,
            "python": {
                "home": None,
                "path": None,
                "version": None,
            },
            "engine": "1.0.3",
        }
        with open(str(FasAPIEnvCfg), "r") as file1:
            Lines = file1.readlines()
            for count, line in enumerate(Lines):
                lnv = line.split("=")
                if lnv[0].strip() == "executable":
                    retValue["python"]["path"] = lnv[1]
                elif lnv[0].strip() == "version":
                    retValue["python"]["version"] = lnv[1]
                elif lnv[0].strip() == "home":
                    retValue["python"]["home"] = lnv[1]
            file1.close()

        # TODO: engine version
        ...

        ...
        return retValue
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.post("/initflproject", response_class=JSONResponse)
async def initfileb_project(path: str):
    pathFile = base64.b64decode(path).decode("utf-8")
    pyscPacker(Path(pathFile))
    return {"state": True}


@routerapi.post("/newproject", response_class=JSONResponse)
async def newproject(wspath: str, data: str):
    try:
        tmpWSPath = Path(str(Path(__file__).parent.parent.parent), f"~tmp/{wspath}")
        if not tmpWSPath.exists():
            os.makedirs(str(tmpWSPath))
        casejson = json.loads(base64.b64decode(data).decode("utf-8"))
        packer = pyscPacker()
        packer.writeCase(False, tmpWSPath, casejson)
        return {"state": True}
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.post("/clearprojtmp", response_class=JSONResponse)
async def clearprojtmp(wspath: str):
    try:
        tmpWSPath = Path(str(Path(__file__).parent.parent.parent), f"~tmp/{wspath}")
        if tmpWSPath.exists():
            shutil.rmtree(str(tmpWSPath), ignore_errors=True, onerror=None)
        return {"state": True}
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.post("/extractproject", response_class=JSONResponse)
async def extractProject(data: str):
    try:
        datajson = json.loads(base64.b64decode(data).decode("utf-8"))
        filePath = Path(datajson["path"])
        oldWSPath = datajson["oldWS"]
        newWSPath = datajson["newWS"]
        packer = pyscPacker()
        resPackar = packer.extractProject(filePath, oldWSPath, newWSPath)
        if isinstance(resPackar, bool) and resPackar:
            return {
                "state": resPackar,
                "cases": (
                    packer.loadCases(
                        Path(
                            str(Path(__file__).parent.parent.parent)
                            + f"\\~tmp\\{newWSPath}"
                        )
                    )
                    if resPackar
                    else None
                ),
            }
        else:
            raise Exception(resPackar)
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


# @routerapi.get("/chkheaderfile", response_class=JSONResponse)
# async def chkfileproj(path: str):
#     pathFile = Path(base64.b64decode(path).decode("utf-8"))
#     if pathFile.exists():
#         packer = pyscPacker()
#         if packer.isValidFileHeader(pathFile):
#             letters = string.ascii_lowercase
#             pathWS = "".join(random.choice(letters) for _ in range(8))
#             tmpPath = str(Path(__file__).parent.parent.parent) + f"\\~tmp\\{pathWS}"
#             if not os.path.exists(tmpPath):
#                 os.makedirs(tmpPath)
#             if not os.path.exists(tmpPath):
#                 return {"state": False}
#             b64tmpPath = base64.b64encode(tmpPath.encode())
#             packer.ExtractFile(pathFile, Path(tmpPath))
#             return {"state": True, "path": b64tmpPath}
#     return {"state": False}


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


@routerapi.post("/importcase", response_class=JSONResponse)
async def importcase(wspath: str, data: str):
    try:
        tmpWSPath = Path(str(Path(__file__).parent.parent.parent), f"~tmp/{wspath}")
        if not tmpWSPath.exists():
            os.makedirs(str(tmpWSPath))
        dataJson = base64.b64decode(data).decode("utf-8")
        json_dict: dict = json.loads(dataJson)
        pathFile = Path(json_dict["path"])
        caseID = json_dict["caseid"]
        newCaseID = json_dict["newcaseid"]
        packer = pyscPacker()
        selCase = packer.importCase(tmpWSPath, pathFile, caseID, newCaseID)
        return {
            "state": True if isinstance(selCase, list) else False,
            "selcase": selCase,
        }
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.post("/wrtproject", response_class=JSONResponse)
async def wrt_project(wspath: str, targetfile: str):
    # try:
    tmpWSPath = Path(str(Path(__file__).parent.parent.parent), f"~tmp/{wspath}")
    targetpath = Path(base64.b64decode(targetfile).decode("utf-8"))
    # temporary file merge
    bundlePath = Path(
        str(Path(__file__).parent.parent.parent), f"~tmp/{wspath}/bundle.bin"
    )
    packer = pyscPacker(bundlePath)
    if packer.writeProject(tmpWSPath, bundlePath):
        # copy to target path
        shutil.copyfile(str(bundlePath), str(targetpath))
    if bundlePath.exists():
        os.remove(str(bundlePath))
    return {"state": True}
    # except Exception as err:
    #     if bundlePath.exists():
    #         os.remove(str(bundlePath))
    #     raise HTTPException(
    #         status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    #         detail=err.args,
    #     )


@routerapi.post("/wrtcases", response_class=JSONResponse)
async def wrt_cases(pathfile: str, istmp: int, gc: str):
    try:
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        if istmp == 1:
            tmpPath = Path(str(Path(__file__).parent.parent.parent), f"~tmp/{pathfile}")
            if not tmpPath.exists():
                os.makedirs(tmpPath)
        else:
            tmpPath = Path(base64.b64decode(pathfile).decode("utf-8"))
        packer = pyscPacker() if istmp == 1 else pyscPacker(tmpPath)
        packer.writeCase(istmp == 1, tmpPath, data)
        return {"state": True}
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


@routerapi.post("/clonecase", response_class=JSONResponse)
async def cloneCase(
    wspath: str, sourceid: int, targetid: int, ctrType: int, typechg: bool
):
    try:
        packer = pyscPacker()
        packer.cloneCase(wspath, sourceid, targetid, ctrType, typechg)
        return {"state": True}
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.post("/chgctrtype", response_class=JSONResponse)
async def chgCtrType(wspath: str, sourceid: int, oldCtrType: int, newCtrType: int):
    try:
        packer = pyscPacker()
        packer.chgCtrType(wspath, sourceid, oldCtrType, newCtrType)
        return {"state": True}
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.post("/wrtgenconf", response_class=JSONResponse)
async def wrt_genconf(wspath: str, caseid: int, gc: str):
    try:
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        tmpPath = Path(str(Path(__file__).parent.parent.parent), f"~tmp/{wspath}")
        if not tmpPath.exists():
            os.makedirs(tmpPath)
        filePath = Path(str(tmpPath), f"genconf_{caseid}.bin")
        with open(str(filePath), "wb") as out1:
            pickle.dump(data, out1)
            out1.close()
        return {"state": True}
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdgenconf", response_class=JSONResponse)
async def rdgenConfig(wspath: str, caseid: int):
    tmpPath = Path(str(Path(__file__).parent.parent.parent), f"~tmp/{wspath}")
    if tmpPath.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadGenConfig(tmpPath, caseid)}
    return {"state": False}


@routerapi.post("/wrtfiscalconf", response_class=JSONResponse)
async def wrt_fiscalconf(wspath: str, caseid: int, gc: str):
    try:
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        tmpPath = Path(str(Path(__file__).parent.parent.parent), f"~tmp/{wspath}")
        if not tmpPath.exists():
            os.makedirs(tmpPath)
        filePath = Path(str(tmpPath), f"fiscal_{caseid}.bin")
        with open(str(filePath), "wb") as out1:
            pickle.dump(data, out1)
            out1.close()
        return {"state": True}
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdfiscalconf", response_class=JSONResponse)
async def rdfiscalconf(wspath: str, caseid: int):
    pathFile = Path(str(Path(__file__).parent.parent.parent), f"~tmp/{wspath}")
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadFiscalConfig(pathFile, caseid)}
    return {"state": False}


@routerapi.post("/wrtproducer", response_class=JSONResponse)
async def wrt_producer(wspath: str, caseid: int, gc: str):
    try:
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        tmpPath = Path(str(Path(__file__).parent.parent.parent), f"~tmp/{wspath}")
        if not tmpPath.exists():
            os.makedirs(tmpPath)
        filePath = Path(str(tmpPath), f"producer_{caseid}.bin")
        with open(str(filePath), "wb") as out1:
            pickle.dump(data, out1)
            out1.close()
        return {"state": True}
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdproducer", response_class=JSONResponse)
async def rdproducer(wspath: str, caseid: int):
    pathFile = Path(str(Path(__file__).parent.parent.parent), f"~tmp/{wspath}")
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadproducer(pathFile, caseid)}
    return {"state": False}


@routerapi.post("/wrtcontract", response_class=JSONResponse)
async def wrt_contract(wspath: str, caseid: int, gc: str):
    try:
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        tmpPath = Path(str(Path(__file__).parent.parent.parent), f"~tmp/{wspath}")
        if not tmpPath.exists():
            os.makedirs(tmpPath)
        filePath = Path(str(tmpPath), f"contracts_{caseid}.bin")
        with open(str(filePath), "wb") as out1:
            pickle.dump(data, out1)
            out1.close()
        return {"state": True}
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdcontracts", response_class=JSONResponse)
async def rdcontracts(wspath: str, caseid: int):
    pathFile = Path(str(Path(__file__).parent.parent.parent), f"~tmp/{wspath}")
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadcontracts(pathFile, caseid)}
    return {"state": False}


@routerapi.post("/wrtcost", response_class=JSONResponse)
async def wrt_cost(wspath: str, caseid: int, mode: int, gc: str):
    try:
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        tmpPath = Path(str(Path(__file__).parent.parent.parent), f"~tmp/{wspath}")
        if not tmpPath.exists():
            os.makedirs(tmpPath)
        match mode:
            case 1:
                filePath = Path(str(tmpPath), f"intangible_{caseid}.bin")
            case 2:
                filePath = Path(str(tmpPath), f"opex_{caseid}.bin")
            case 3:
                filePath = Path(str(tmpPath), f"asr_{caseid}.bin")
            case _:
                filePath = Path(str(tmpPath), f"tangible_{caseid}.bin")
        with open(str(filePath), "wb") as out1:
            pickle.dump(data, out1)
            out1.close()
        return {"state": True}
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdcosts", response_class=JSONResponse)
async def rdcosts(wspath: str, mode: int, caseid: int):
    pathFile = Path(str(Path(__file__).parent.parent.parent), f"~tmp/{wspath}")
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadCosts(mode, pathFile, caseid)}
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

    sumCalc = Summaries(type, json_dict)
    try:
        return {
            "card": {
                "year": sumCalc.Year,
                "Oil": sumCalc.getOil(),
                "Gas": sumCalc.getGas(),
                "Revenue": sumCalc.getRevenue(),
                "Investment": sumCalc.getInvesment(),
                "Expenses": sumCalc.getExpenses(),
                "Tax": sumCalc.getTax(),
                "CashFlow": sumCalc.getCashFlow(),
                "pie": sumCalc.getPie(),
            },
            "summary": sumCalc.summary,
        }
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


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
