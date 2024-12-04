import base64
import copy
import json
import logging
import os
import pickle
import random
import select
import shutil
import string
import struct
import threading
import traceback

# from distutils.sysconfig import EXEC_PREFIX
from pathlib import Path
from typing import Annotated, Any

# from sqlalchemy.orm import Session
import numpy as np
from fastapi import APIRouter, Body, Depends, Form, HTTPException, status

# from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, JSONResponse
from pyapp.modules.filebrowser import list_drives, list_files

# from pyapp.modules.monte import ProcessMonte
from pyapp.modules.sens import ProcessSens
from pyapp.shemas import TableRequest
from pyapp.shemas.project import ProjectCreate, ProjectUpdate
from pydantic import BaseModel
from pyscnomics import contracts
from pyscnomics.api.adapter import (
    get_asr_expenditures,
    get_contract_optimization,
    get_contract_table,
    get_economic_limit,
    get_grosssplit_split,
    get_lbt_expenditures,
    get_ltp_dict,
    get_rpd_dict,
    get_transition_split,
)
from pyscnomics.tools import summary
from sqlalchemy.ext.asyncio import AsyncSession

from ..crud.project import create_project, get_projects, update_project
from ..database.db import get_async_session
from ..database.projdb import make_proj_db_and_tables
from ..models.project import Project
from ..modules import basePath
from ..modules.basePath import baseAppPath
from ..modules.casecombine import CaseCombine
from ..modules.caseIncremental import CaseIncremental
from ..modules.lzstring import LZString
from ..modules.pyscpack import pyscPacker
from ..modules.summaries import Summaries

log = logging.getLogger()


class bcolors:
    HEADER = "\033[95m"
    OKBLUE = "\033[94m"
    OKCYAN = "\033[96m"
    OKGREEN = "\033[92m"
    WARNING = "\033[93m"
    FAIL = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"


routerapi = APIRouter(prefix="/auth", tags=["appapi"])


class DataPost(BaseModel):
    data: dict


basePyPath = baseAppPath


@routerapi.get("/mydirs", response_class=JSONResponse)
async def read_dirs(flext: str, root: str):
    if root:
        pathname: str = base64.b64decode(root).decode("utf-8")
        if pathname != "__local__":
            return (
                list_files(flext, Path(pathname))
                if pathname != "__drive__"
                else list_drives()
            )
    return list_files(flext, Path(basePyPath, "Samples"))


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
    try:
        dataStr = json.loads(base64.b64decode(data).decode("utf-8"))
        if not await update_project(db, ProjectUpdate(**dataStr)):
            res = await create_project(db=db, proj=ProjectCreate(**dataStr))
        # create DB
        path: str = dataStr.get("path")
        if not Path(path).exists():
            # create DB
            await make_proj_db_and_tables(path)
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=r"Error while updating data",
        )
    return {"state": True}


@routerapi.get("/fileinfo", response_class=JSONResponse)
async def fileinfo(path: str | None, wspath: str):
    try:
        pathFile = base64.b64decode(path).decode("utf-8") if path is not None else None
        tmpWSPath = Path(basePyPath, "~tmp", f"{wspath}")
        # get environtment
        FasAPIEnvCfg = Path(
            str(basePyPath),
            "pyscnomics-env",
            "pyvenv.cfg",  # "velz-vue-env/pyvenv.cfg"
        )
        retValue = {
            "filepath": "Unsaved file (newfile)" if pathFile is None else pathFile,
            "python": {
                "home": None,
                "path": None,
                "version": None,
            },
            "engine": "0.0.0",
        }
        with open(FasAPIEnvCfg, "r") as file1:
            Lines = file1.readlines()
            for count, line in enumerate(Lines):
                lnv = line.split("=")
                if lnv[0].strip() == "base-executable":
                    retValue["python"]["path"] = lnv[1]
                elif lnv[0].strip() == "version_info":
                    retValue["python"]["version"] = lnv[1]
                elif lnv[0].strip() == "home":
                    retValue["python"]["home"] = lnv[1]
            file1.close()

        # TODO: engine version
        ...

        ...
        return retValue
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.post("/initflproject", response_class=JSONResponse)
async def initfileb_project(path: str):
    pathFile = base64.b64decode(path).decode("utf-8")
    pyscPacker(Path(pathFile))
    return {"state": True}


@routerapi.put("/newproject", response_class=JSONResponse)
async def newproject(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        data = dataDict["data"]
        tmpWSPath = Path(basePyPath, "~tmp", f"{wspath}")
        if not tmpWSPath.exists():
            os.makedirs(str(tmpWSPath))
        casejson = json.loads(base64.b64decode(data).decode("utf-8"))
        packer = pyscPacker()
        packer.writeCase(False, tmpWSPath, casejson)
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/clearprojtmp", response_class=JSONResponse)
async def clearprojtmp(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        tmpWSPath = Path(basePyPath, "~tmp", f"{wspath}")
        if tmpWSPath.exists():
            shutil.rmtree(str(tmpWSPath), ignore_errors=True, onerror=None)
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/extractproject", response_class=JSONResponse)
async def extractProject(data: dict):
    try:
        datajson = json.loads(base64.b64decode(data["json"]).decode("utf-8"))
        filePath = Path(datajson["path"])
        oldWSPath = datajson["oldWS"]
        newWSPath = datajson["newWS"]
        packer = pyscPacker()
        resPackar = packer.extractProject(filePath, oldWSPath, newWSPath)
        if isinstance(resPackar, bool) and resPackar:
            return {
                "state": resPackar,
                "cases": (
                    packer.loadCases(Path(basePyPath, "~tmp", f"{newWSPath}"))
                    if resPackar
                    else None
                ),
            }
        else:
            raise Exception(resPackar)

    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/chkprjintegrity", response_class=JSONResponse)
async def chkexistingcases(data: dict):
    try:
        datajson = json.loads(base64.b64decode(data["json"]).decode("utf-8"))
        ws = datajson["ws"]
        cases = datajson["cases"]
        wsPath: Path = Path(basePyPath, "~tmp", f"{ws}")
        if not wsPath.exists() and not Path(wsPath, "cases.bin").exists():
            return {"valid": False}
        # tes genconf only
        for idx, icase in enumerate(cases):
            id = icase["id"]
            if not Path(wsPath, f"genconf_{id}.bin").exists():
                return {"valid": False}

        return {"valid": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
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
#             tmpPath = str(basePyPath) + f"\\~tmp\\{pathWS}"
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
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/importcase", response_class=JSONResponse)
async def importcase(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        data = dataDict["data"]
        tmpWSPath = Path(basePyPath, "~tmp", f"{wspath}")
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
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/wrtproject", response_class=JSONResponse)
async def wrt_project(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        targetfile = dataDict["targetfile"]
        tmpWSPath = Path(basePyPath, "~tmp", f"{wspath}")
        targetpath = Path(base64.b64decode(targetfile).decode("utf-8"))
        # temporary file merge
        bundlePath = Path(basePyPath, "~tmp", f"{wspath}", "bundle.bin")
        packer = pyscPacker(bundlePath)
        if packer.writeProject(tmpWSPath, bundlePath):
            # copy to target path
            shutil.copyfile(str(bundlePath), str(targetpath))
        if bundlePath.exists():
            os.remove(str(bundlePath))
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        if bundlePath.exists():
            os.remove(str(bundlePath))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/wrtcases", response_class=JSONResponse)
async def wrt_cases(dataDict: dict):
    try:
        pathfile = dataDict["pathfile"]
        istmp = dataDict["istmp"]
        gc = dataDict["gc"]
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        if istmp == 1:
            tmpPath = Path(basePyPath, "~tmp", f"{pathfile}")
            if not tmpPath.exists():
                os.makedirs(str(tmpPath))
        else:
            tmpPath = Path(base64.b64decode(pathfile).decode("utf-8"))
        packer = pyscPacker() if istmp == 1 else pyscPacker(tmpPath)
        packer.writeCase(istmp == 1, tmpPath, data)
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
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


@routerapi.put("/clonecase", response_class=JSONResponse)
async def cloneCase(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        sourceid = dataDict["sourceid"]
        targetid = dataDict["targetid"]
        ctrType = dataDict["ctrType"]
        typechg = dataDict["typechg"]
        packer = pyscPacker()
        packer.cloneCase(wspath, sourceid, targetid, ctrType, typechg)
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/chgctrtype", response_class=JSONResponse)
async def chgCtrType(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        sourceid = dataDict["sourceid"]
        oldCtrType = dataDict["oldCtrType"]
        newCtrType = dataDict["newCtrType"]
        packer = pyscPacker()
        packer.chgCtrType(wspath, sourceid, oldCtrType, newCtrType)
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/wrtgenconf", response_class=JSONResponse)
async def wrt_genconf(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        caseid = dataDict["caseid"]
        gc = dataDict["gc"]
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        tmpPath = Path(basePyPath, "~tmp", f"{wspath}")
        if not tmpPath.exists():
            os.makedirs(str(tmpPath))
        filePath = Path(tmpPath, f"genconf_{caseid}.bin")
        with open(filePath, "wb") as out1:
            pickle.dump(data, out1)
            out1.close()
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdgenconf", response_class=JSONResponse)
async def rdgenConfig(wspath: str, caseid: int):
    tmpPath = Path(basePyPath, "~tmp", f"{wspath}")
    if tmpPath.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadGenConfig(tmpPath, caseid)}
    return {"state": False}


@routerapi.put("/wrtfiscalconf", response_class=JSONResponse)
async def wrt_fiscalconf(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        caseid = dataDict["caseid"]
        gc = dataDict["gc"]
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        tmpPath = Path(basePyPath, "~tmp", f"{wspath}")
        if not tmpPath.exists():
            os.makedirs(str(tmpPath))
        filePath = Path(tmpPath, f"fiscal_{caseid}.bin")
        with open(filePath, "wb") as out1:
            pickle.dump(data, out1)
            out1.close()
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdfiscalconf", response_class=JSONResponse)
async def rdfiscalconf(wspath: str, caseid: int):
    pathFile = Path(basePyPath, "~tmp", f"{wspath}")
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadFiscalConfig(pathFile, caseid)}
    return {"state": False}


@routerapi.put("/wrtproducer", response_class=JSONResponse)
async def wrt_producer(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        caseid = dataDict["caseid"]
        gc = dataDict["gc"]
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        tmpPath = Path(basePyPath, "~tmp", f"{wspath}")
        if not tmpPath.exists():
            os.makedirs(str(tmpPath))
        filePath = Path(tmpPath, f"producer_{caseid}.bin")
        with open(filePath, "wb") as out1:
            pickle.dump(data, out1)
            out1.close()
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdproducer", response_class=JSONResponse)
async def rdproducer(wspath: str, caseid: int):
    pathFile = Path(basePyPath, "~tmp", f"{wspath}")
    if pathFile.exists():
        packer = pyscPacker()
        proddata = {"state": True, "data": packer.loadproducer(pathFile, caseid)}
        return proddata
    return {"state": False}


@routerapi.put("/wrtcontract", response_class=JSONResponse)
async def wrt_contract(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        caseid = dataDict["caseid"]
        gc = dataDict["gc"]
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        tmpPath = Path(basePyPath, "~tmp", f"{wspath}")
        if not tmpPath.exists():
            os.makedirs(str(tmpPath))
        filePath = Path(tmpPath, f"contracts_{caseid}.bin")
        with open(filePath, "wb") as out1:
            pickle.dump(data, out1)
            out1.close()
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdcontracts", response_class=JSONResponse)
async def rdcontracts(wspath: str, caseid: int):
    pathFile = Path(basePyPath, "~tmp", f"{wspath}")
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadcontracts(pathFile, caseid)}
    return {"state": False}


@routerapi.put("/wrtcost", response_class=JSONResponse)
async def wrt_cost(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        caseid = dataDict["caseid"]
        mode = dataDict["mode"]
        gc = dataDict["gc"]
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        tmpPath = Path(basePyPath, "~tmp", f"{wspath}")
        if not tmpPath.exists():
            os.makedirs(str(tmpPath))
        match mode:
            case 1:
                filePath = Path(tmpPath, f"intangiblev2_{caseid}.bin")
            case 2:
                filePath = Path(tmpPath, f"opexv2_{caseid}.bin")
            case 3:
                filePath = Path(tmpPath, f"asrv2_{caseid}.bin")
            case 4:
                filePath = Path(tmpPath, f"cosv2_{caseid}.bin")
            case 5:
                filePath = Path(tmpPath, f"lbtv2_{caseid}.bin")
            case _:
                filePath = Path(tmpPath, f"tangiblev2_{caseid}.bin")
        with open(filePath, "wb") as out1:
            pickle.dump(data, out1)
            out1.close()
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdcosts", response_class=JSONResponse)
async def rdcosts(wspath: str, mode: int, caseid: int):
    pathFile = Path(basePyPath, "~tmp", f"{wspath}")
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadCosts(mode, pathFile, caseid)}
    return {"state": False}


@routerapi.put("/wrtsens", response_class=JSONResponse)
async def wrt_sens(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        caseid = dataDict["caseid"]
        gc = dataDict["gc"]
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        tmpPath = Path(basePyPath, "~tmp", f"{wspath}")
        if not tmpPath.exists():
            os.makedirs(str(tmpPath))
        filePath = Path(tmpPath, f"senscfg_{caseid}.bin")
        with open(filePath, "wb") as fs:
            pickle.dump(data, fs)
            fs.close()
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdsens", response_class=JSONResponse)
async def rdsens(wspath: str, caseid: int):
    pathFile = Path(basePyPath, "~tmp", f"{wspath}")
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadsens(pathFile, caseid)}
    return {"state": False}


@routerapi.put("/wrtmonte", response_class=JSONResponse)
async def wrt_monte(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        caseid = dataDict["caseid"]
        gc = dataDict["gc"]
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        tmpPath = Path(basePyPath, "~tmp", f"{wspath}")
        if not tmpPath.exists():
            os.makedirs(str(tmpPath))
        filePath = Path(tmpPath, f"montecfg_{caseid}.bin")
        with open(filePath, "wb") as fs:
            pickle.dump(data, fs)
            fs.close()
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdmonte", response_class=JSONResponse)
async def rdmonte(wspath: str, caseid: int):
    pathFile = Path(basePyPath, "~tmp", f"{wspath}")
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadmonte(pathFile, caseid)}
    return {"state": False}


@routerapi.put("/wrtoptim", response_class=JSONResponse)
async def wrt_optim(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        caseid = dataDict["caseid"]
        gc = dataDict["gc"]
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        tmpPath = Path(basePyPath, "~tmp", f"{wspath}")
        if not tmpPath.exists():
            os.makedirs(str(tmpPath))
        filePath = Path(tmpPath, f"optimcfg_{caseid}.bin")
        with open(filePath, "wb") as fs:
            pickle.dump(data, fs)
            fs.close()
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdoptim", response_class=JSONResponse)
async def rdoptim(wspath: str, caseid: int):
    pathFile = Path(basePyPath, "~tmp", f"{wspath}")
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadoptim(pathFile, caseid)}
    return {"state": False}


@routerapi.put("/wrtcompare", response_class=JSONResponse)
async def wrt_compare(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        gc = dataDict["gc"]
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        tmpPath = Path(basePyPath, "~tmp", f"{wspath}")
        if not tmpPath.exists():
            os.makedirs(str(tmpPath))
        filePath = Path(tmpPath, "compare.bin")
        with open(filePath, "wb") as fs:
            pickle.dump(data, fs)
            fs.close()
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdcompare", response_class=JSONResponse)
async def rdCompare(wspath: str):
    pathFile = Path(basePyPath, "~tmp", f"{wspath}")
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadCompare(pathFile)}
    return {"state": False}


@routerapi.put("/wrtcombine", response_class=JSONResponse)
async def wrt_combine(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        gc = dataDict["gc"]
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        tmpPath = Path(basePyPath, "~tmp", f"{wspath}")
        if not tmpPath.exists():
            os.makedirs(str(tmpPath))
        filePath = Path(tmpPath, "combine2.bin")
        with open(filePath, "wb") as fs:
            pickle.dump(data, fs)
            fs.close()
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdcombine", response_class=JSONResponse)
async def rdCombine(wspath: str):
    pathFile = Path(basePyPath, "~tmp", f"{wspath}")
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadCombine(pathFile)}
    return {"state": False}


@routerapi.put("/wrtincr", response_class=JSONResponse)
async def wrt_incr(dataDict: dict):
    try:
        wspath = dataDict["wspath"]
        gc = dataDict["gc"]
        data = json.loads(base64.b64decode(gc).decode("utf-8"))
        tmpPath = Path(basePyPath, "~tmp", f"{wspath}")
        if not tmpPath.exists():
            os.makedirs(str(tmpPath))
        filePath = Path(tmpPath, "incr.bin")
        with open(filePath, "wb") as fs:
            pickle.dump(data, fs)
            fs.close()
        return {"state": True}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/rdincr", response_class=JSONResponse)
async def rdincr(wspath: str):
    pathFile = Path(basePyPath, "~tmp", f"{wspath}")
    if pathFile.exists():
        packer = pyscPacker()
        return {"state": True, "data": packer.loadIncr(pathFile)}
    return {"state": False}


@routerapi.get("/closeddata", response_class=JSONResponse)
async def closeddata(tmppath: str):
    pathFile = Path(base64.b64decode(tmppath).decode("utf-8"))
    if pathFile.exists():
        shutil.rmtree(str(pathFile), ignore_errors=True, onerror=None)
    return {"state": False}


@routerapi.put("/calc_ext_quick_summ")
async def calc_ext_quick_summ(data: dict):
    try:
        type = int(data["type"])
        dataJson = base64.b64decode(data["json"]).decode("utf-8")
        json_dict: dict = json.loads(dataJson)

        sumCalc = Summaries(type, json_dict)
        return {
            "GOI2GR": sumCalc.summary["gov_take_over_gross_rev"],
            "IRR": sumCalc.summary["ctr_irr"],
            "NPV": sumCalc.summary["ctr_npv"],
            "PI": sumCalc.summary["ctr_pi"],
        }

    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/calc_ext_summ_npv")
async def calc_ext_summ_npv(data: dict):
    try:
        type = data["type"]
        dataJson = base64.b64decode(data["json"]).decode("utf-8")
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
            sensNPV = (
                {
                    par: [
                        [-(1 - row[0]) * 100, row[1]]
                        for r, row in enumerate(output[par])
                    ]
                    for i, par in enumerate(json_dict["parameter"])
                }
                if output is not None
                else None
            )
        except Exception as errirr:
            print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
            print(f"{bcolors.FAIL}ERROR: {errirr}{bcolors.ENDC}")
            sensNPV = None

        return {
            "card": {
                "NPV": sensNPV,
            },
        }
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/calc_ext_summ_irr")
async def calc_ext_summ_irr(data: dict):
    try:
        type = data["type"]
        dataJson = base64.b64decode(data["json"]).decode("utf-8")
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
            sensIRR = (
                {
                    par: [
                        [-(1 - row[0]) * 100, row[2] * 100]
                        for r, row in enumerate(output[par])
                    ]
                    for i, par in enumerate(json_dict["parameter"])
                }
                if output is not None
                else None
            )
        except Exception as errirr:
            print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
            print(f"{bcolors.FAIL}ERROR: {errirr}{bcolors.ENDC}")
            sensIRR = None

        return {
            "card": {
                "IRR": sensIRR,
            },
        }
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/calc_ext_summ")
async def calc_ext_summ(data: dict):
    try:
        type = data["type"]
        dataJson = base64.b64decode(data["json"]).decode("utf-8")
        json_dict: dict = json.loads(dataJson)

        sumCalc = Summaries(type, json_dict["contract"])
        # do not load sens here!!  reduce performances!!!
        # try:
        #     SensTask = ProcessSens(
        #         type,
        #         json_dict["contract"],
        #         json_dict["parameter"],
        #         json_dict["config"]["min"],
        #         json_dict["config"]["max"],
        #     )
        #     output = SensTask.Run()
        #     sensIRR = (
        #         {
        #             par: [
        #                 [-(1 - row[0]) * 100, row[2] * 100]
        #                 for r, row in enumerate(output[par])
        #             ]
        #             for i, par in enumerate(json_dict["parameter"])
        #         }
        #         if output is not None
        #         else None
        #     )
        # except Exception:
        #     sensIRR = None
        sensIRR = None

        splitInfo = (
            get_grosssplit_split(data=json_dict["contract"])
            if type == 2
            else get_transition_split(data=json_dict["contract"])
            if type >= 3
            else None
        )

        cardResult = {
            "card": {
                "year": sumCalc.Year,
                "Oil": sumCalc.getOil(),
                "Gas": sumCalc.getGas(),
                "Revenue": sumCalc.getRevenue(),
                # "Investment": sumCalc.getInvesment(),
                "Expenses": sumCalc.getExpenses(),
                # "Tax": sumCalc.getTax(),
                "CashFlow": sumCalc.getCashFlow(),
                "GoI": sumCalc.getGoI(),
                "pie": sumCalc.getPie(),
                "IRR": sensIRR,
                "NPV": None,
            },
            "summary": sumCalc.summary,
            "splitInfo": splitInfo,
        }
        return cardResult

    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/get_case_summaries")
async def get_case_summaries(dataEnt: dict):
    keyofsum = [
        "lifting_oil",
        "oil_wap",
        "lifting_gas",
        "gas_wap",
        "gross_revenue",
        "none",
        "ctr_gross_share",
        "gov_gross_share",
        "sunk_cost",
        "investment",
        "tangible",
        "intangible",
        "opex_asr_lbt",
        "opex",
        "asr",
        "cost_recovery/deductible_cost",
        "cost_recovery_over_gross_rev",
        "unrec_cost",
        "unrec_over_gross_rev",
        "none",
        "ctr_net_share",
        "ctr_net_share_over_gross_share",
        "ctr_net_cashflow",
        "ctr_net_cashflow_over_gross_rev",
        "ctr_npv",
        "ctr_irr",
        "ctr_pot",
        "ctr_pv_ratio",
        "ctr_pi",
        "none",
        "gov_gross_share",
        "gov_ftp_share",
        "gov_ddmo",
        "gov_tax_income",
        "gov_take",
        "gov_take_over_gross_rev",
        "gov_take_npv",
        "total_indirect_taxes",
    ]
    try:
        type = dataEnt["type"]
        caseid = dataEnt["caseid"]
        data = dataEnt["json"]
        dataJson = base64.b64decode(data).decode("utf-8")
        json_dict: dict = json.loads(dataJson)
        sumCalc = Summaries(type, json_dict)
        summary = sumCalc.summary
        contracts = sumCalc.contract

        return {
            "summary": [
                summary[key] if key != "none" else None
                for i, key in enumerate(keyofsum)
            ],
            "cf": {
                "y": sumCalc.Year,
                "d": sumCalc.getCashFlow()["table"][0],
            },
        }
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/calc_cf")
async def calc_cf(data: dict):
    try:
        type = data["type"]
        dataJson = base64.b64decode(data["json"]).decode("utf-8")
        json_dict: dict = json.loads(dataJson)
        if type == 1:
            return get_contract_table(data=json_dict, contract_type="Cost Recovery")
        elif type == 2:
            return get_contract_table(data=json_dict, contract_type="Gross Split")
        elif type >= 3:
            return get_contract_table(data=json_dict, contract_type="Transition")
        else:
            return get_contract_table(data=json_dict, contract_type="Base Project")
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/calc_ecolimit")
async def calcEcolimit(data: dict):
    try:
        dataJson = base64.b64decode(data["json"]).decode("utf-8")
        json_dict = json.loads(dataJson)
        ecolimit_ = get_economic_limit(data=json_dict)
        return {"ecoYear": int(ecolimit_)}
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/calc_sens")
async def calc_sens(data: dict):
    try:
        type = int(data["type"])
        dataJson = base64.b64decode(data["json"]).decode("utf-8")
        json_dict: dict = json.loads(dataJson)
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
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/calc_monte")
async def calc_monte(data: dict):
    try:
        ws = data["ws"]
        id = data["id"]
        tmpWSPath = Path(basePyPath, "~tmp", f"{ws}")
        if not tmpWSPath.exists():
            os.makedirs(str(tmpWSPath))
        # create data file for run monte
        dataPath = Path(tmpWSPath, f"montedatarun_{id}.bin")
        with open(dataPath, "wb") as fw:
            pickle.dump(data, fw)
            fw.close()
        b64filePath = base64.b64encode(str(dataPath).encode())
        return {"state": "running", "path": b64filePath}

        # type = data["type"]
        # dataJson = base64.b64decode(data["json"]).decode("utf-8")
        # json_dict: dict = json.loads(dataJson)
        # monte = ProcessMonte(
        #     type,
        #     ws,
        #     id,
        #     json_dict["contract"],
        #     json_dict["numsim"],
        #     json_dict["parameter"],
        # )
        # await monte.calculate()
        # # del monte
        # # print("monte del")
        # return {"state": "off", "path": False}

    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/get_monte_result")
async def get_monte_result(data: dict):
    try:
        ws = data["ws"]
        id = data["id"]
        hashData = data["hashData"]
        pathWS = Path(basePyPath, "~tmp", f"{ws}")
        packer = pyscPacker()
        monteres = packer.loadmonteRes(pathWS, id)
        return {
            "res": (
                monteres["result"]
                if monteres["hash"] is not None and hashData == monteres["hash"]
                else None
            )
        }
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/get_optim_base_target")
async def get_optim_base_target(data: dict):
    try:
        type = data["type"]
        dataJson = base64.b64decode(data["json"]).decode("utf-8")
        json_dict: dict = json.loads(dataJson)
        sumCalc = Summaries(type, json_dict)
        return {
            "IRR": sumCalc.summary["ctr_irr"] if sumCalc.summary is not None else 0,
            "NPV": sumCalc.summary["ctr_npv"] if sumCalc.summary is not None else 0,
            "PI": sumCalc.summary["ctr_pi"] if sumCalc.summary is not None else 0,
        }

    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/calc_optim")
async def calc_optim(dataDict: dict):
    try:
        type = dataDict["type"]
        dataJson = base64.b64decode(dataDict["json"]).decode("utf-8")
        json_dict: dict = json.loads(dataJson)
        resOptim = (
            get_contract_optimization(data=json_dict, contract_type="Cost Recovery")
            if type == 1
            else (
                get_contract_optimization(data=json_dict, contract_type="Gross Split")
                if type == 2
                else get_contract_optimization(
                    data=json_dict, contract_type="Transition"
                )
            )
        )
        if resOptim is not None:
            # calc base
            sumCalc = Summaries(type, json_dict)
            baseSummary = sumCalc.summary
            json_dict2 = copy.deepcopy(json_dict)
            contract = json_dict2 if type < 3 else json_dict2["contract_2"]
            for i, key in enumerate(resOptim["list_params_value"].keys()):
                if (
                    key == "Oil Contractor Pre Tax"
                    and resOptim["list_params_value"][key] != "Base Value"
                ):
                    contract["costrecovery"]["oil_ctr_pretax_share"] = resOptim[
                        "list_params_value"
                    ][key]
                elif (
                    key == "Gas Contractor Pre Tax"
                    and resOptim["list_params_value"][key] != "Base Value"
                ):
                    contract["costrecovery"]["gas_ctr_pretax_share"] = resOptim[
                        "list_params_value"
                    ][key]
                elif (
                    key == "Oil FTP Portion"
                    and resOptim["list_params_value"][key] != "Base Value"
                ):
                    contract["costrecovery"]["oil_ftp_portion"] = resOptim[
                        "list_params_value"
                    ][key]
                elif (
                    key == "Gas FTP Portion"
                    and resOptim["list_params_value"][key] != "Base Value"
                ):
                    contract["costrecovery"]["gas_ftp_portion"] = resOptim[
                        "list_params_value"
                    ][key]
                elif (
                    key == "Oil IC"
                    and resOptim["list_params_value"][key] != "Base Value"
                ):
                    contract["costrecovery"]["oil_ic_rate"] = resOptim[
                        "list_params_value"
                    ][key]
                elif (
                    key == "Gas IC"
                    and resOptim["list_params_value"][key] != "Base Value"
                ):
                    contract["costrecovery"]["gas_ic_rate"] = resOptim[
                        "list_params_value"
                    ][key]
                elif (
                    key == "Oil DMO Fee"
                    and resOptim["list_params_value"][key] != "Base Value"
                ):
                    if type in [1, 3, 6]:
                        contract["costrecovery"]["oil_dmo_fee_portion"] = resOptim[
                            "list_params_value"
                        ][key]
                    else:
                        contract["grosssplit"]["oil_dmo_fee_portion"] = resOptim[
                            "list_params_value"
                        ][key]
                elif (
                    key == "Gas DMO Fee"
                    and resOptim["list_params_value"][key] != "Base Value"
                ):
                    if type == 1:
                        contract["costrecovery"]["gas_dmo_fee_portion"] = resOptim[
                            "list_params_value"
                        ][key]
                    else:
                        contract["grosssplit"]["gas_dmo_fee_portion"] = resOptim[
                            "list_params_value"
                        ][key]
                elif (
                    key == "VAT Rate"
                    and resOptim["list_params_value"][key] != "Base Value"
                ):
                    contract["contract_arguments"]["vat_rate"] = resOptim[
                        "list_params_value"
                    ][key]
                elif (
                    key == "Effective Tax Rate"
                    and resOptim["list_params_value"][key] != "Base Value"
                ):
                    contract["contract_arguments"]["tax_rate"] = resOptim[
                        "list_params_value"
                    ][key]
                elif (
                    key == "Ministerial Discretion"
                    and resOptim["list_params_value"][key] != "Base Value"
                ):
                    contract["grosssplit"]["split_ministry_disc"] = resOptim[
                        "list_params_value"
                    ][key]
                elif (
                    key == "Depreciation Acceleration"
                    and resOptim["list_params_value"][key]["depreciation acceleration"]
                    != "Base Value"
                ):
                    for k in contract["capital"].keys():
                        contract["capital"][k]["useful_life"] = resOptim[
                            "list_params_value"
                        ][key]["optimized_useful_life"]["useful_life_optimized"]

            sumCalc2 = Summaries(type, json_dict2)
            optimSummary = sumCalc2.summary
            keyofsum = [
                "lifting_oil",
                "oil_wap",
                "lifting_gas",
                "gas_wap",
                "gross_revenue",
                "none",
                "ctr_gross_share",
                "gov_gross_share",
                "sunk_cost",
                "investment",
                "tangible",
                "intangible",
                "opex_asr_lbt",
                "opex",
                "asr",
                "cost_recovery/deductible_cost",
                "cost_recovery_over_gross_rev",
                "unrec_cost",
                "unrec_over_gross_rev",
                "none",
                "ctr_net_share",
                "ctr_net_share_over_gross_share",
                "ctr_net_cashflow",
                "ctr_net_cashflow_over_gross_rev",
                "ctr_npv",
                "ctr_irr",
                "ctr_pot",
                "ctr_pv_ratio",
                "ctr_pi",
                "none",
                "gov_gross_share",
                "gov_ftp_share",
                "gov_ddmo",
                "gov_tax_income",
                "gov_take",
                "gov_take_over_gross_rev",
                "gov_take_npv",
                "total_indirect_taxes",
            ]

            return {
                "state": True,
                "out": {
                    "result": resOptim,
                    "summary1": [
                        baseSummary[key] if key != "none" else None
                        for i, key in enumerate(keyofsum)
                    ],
                    "summary2": [
                        optimSummary[key] if key != "none" else None
                        for i, key in enumerate(keyofsum)
                    ],
                },
            }
        else:
            return {"state": False, "out": None}

    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/combinecase")
async def calc_combine(dataDict: dict):
    try:
        ctrtype = dataDict["ctrtype"]
        idx = dataDict["idx"]
        last = dataDict["last"]
        data = dataDict["data"]
        dataJson = base64.b64decode(data).decode("utf-8")
        json_dict: dict = json.loads(dataJson)
        ws = base64.b64decode(json_dict["filename"]).decode("utf-8")
        if idx == 0:
            tmpPath = Path(basePyPath, "~tmp", f"{ws}")
            letters = string.ascii_lowercase
            tmpPath = Path(
                str(tmpPath), "".join(random.choice(letters) for _ in range(8)) + ".bin"
            )
        else:
            tmpPath = Path(ws)
        combine = CaseCombine(
            caseIndex=idx,
            tmpFile=tmpPath,
            isLast=last,
            ctrType=ctrtype,
            prevCtrType=np.array(list(json_dict["CtrType"])),
            dataJson=json_dict["data"],
            inflation_rate=json_dict["argument"]["inflation_rate"],
            discount_rate=json_dict["argument"]["discount_rate"],
            reference_year=json_dict["argument"]["reference_year"],
            npv_mode=json_dict["argument"]["npv_mode"],
            discounting_mode=json_dict["argument"]["discounting_mode"],
        )
        return combine.concatenate()

    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/incrementalcase")
async def calc_incremental(dataDict: dict):
    try:
        ctrtype = list(dataDict["CtrType"])
        data = base64.b64decode(dataDict["data"]).decode("utf-8")
        json_dict: dict = json.loads(data)
        incr_ = CaseIncremental(
            ctrType=ctrtype,
            dataJson=json_dict["data"],
            inflation_rate=json_dict["argument"]["inflation_rate"],
            discount_rate=json_dict["argument"]["discount_rate"],
            reference_year=json_dict["argument"]["reference_year"],
            npv_mode=json_dict["argument"]["npv_mode"],
            discounting_mode=json_dict["argument"]["discounting_mode"],
        )
        return incr_.redux()

    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/calc_ltp", response_class=JSONResponse)
async def calc_ltp(dataDict: dict):
    try:
        return get_ltp_dict(data=dataDict)
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/calc_rpd", response_class=JSONResponse)
async def calc_rpd(dataDict: dict):
    try:
        return get_rpd_dict(data=dataDict)
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/geteconomiclimit", response_class=JSONResponse)
async def getEconomicLimit(dataDict: dict):
    try:
        data = base64.b64decode(dataDict["data"]).decode("utf-8")
        json_dict: dict = json.loads(data)
        return get_economic_limit(data=json_dict)
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/getasrexpenditures", response_class=JSONResponse)
async def getAsrExpenditures(dataDict: dict):
    try:
        data = base64.b64decode(dataDict["data"]).decode("utf-8")
        json_dict: dict = json.loads(data)
        return get_asr_expenditures(data=json_dict)
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.put("/getlbtexpenditures", response_class=JSONResponse)
async def getLbtExpenditures(dataDict: dict):
    try:
        data = base64.b64decode(dataDict["data"]).decode("utf-8")
        json_dict: dict = json.loads(data)
        return get_lbt_expenditures(data=json_dict)
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/psc_version", response_class=JSONResponse)
async def psc_version():
    import requests

    try:
        req = requests.get(
            "https://raw.githubusercontent.com/edealam/pscnomics-packages/main/version.json"
        )
        return req.json()
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )


@routerapi.get("/getmanualbook", response_class=JSONResponse)
async def getManualBook():
    try:
        return FileResponse(path=Path(basePyPath, "docs", "manualbook.pdf"))
    except Exception as err:
        print(f"{bcolors.WARNING}{traceback.format_exc()}{bcolors.ENDC}")
        print(f"{bcolors.FAIL}ERROR: {err}{bcolors.ENDC}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err.args,
        )
