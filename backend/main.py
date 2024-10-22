import asyncio
import gc as gcColl
import json
import multiprocessing
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pyapp.database.db import create_db_and_tables
from pyapp.modules import basePath
from pyapp.modules.wsconnection import wsMan
from pyapp.routes import routerapi
from pyscnomics.api.router import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    yield


app = FastAPI(lifespan=lifespan)

origins = [
    "*",
    # "http://localhost:5000",
    # "http://localhost:5173",
    # "http://127.0.0.1:5000",
    # "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TODO: add include route for pyscnomics
app.include_router(router, tags=["api"])
# ----

# webbase route
app.include_router(routerapi, prefix="/api")


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: int):
    await wsMan.connect(websocket)
    try:
        await wsMan.broadcast(json.dumps({"client": client_id, "status": 1}))
        while True:
            data = await websocket.receive_text()
            # await wsMan.send_personal_message(f"You wrote: {data}", websocket)
            await wsMan.broadcast(f"Client #{client_id} says: {data}")
    except WebSocketDisconnect:
        wsMan.disconnect(websocket)
        await wsMan.broadcast(f"Client #{client_id} left the chat")


def setPort():
    p = 9999
    try:
        p = sys.argv[1]
    except Exception:
        print(f"error with sys.argv, assigned default port: {p}")
    return p


port = setPort()


def setRootApp():
    _path: str = None
    try:
        _path = sys.argv[2]
        _path = _path.replace('"', "")
        if _path.strip() == "":
            raise Exception("error with sys.argv")
    except Exception:
        print("error with sys.argv, assigned default root app: None")
    return _path


basePath.baseAppPath = setRootApp()
root_home = Path(basePath.baseAppPath, "frontend")
print(root_home)
if not root_home.exists():
    root_home = Path(basePath.baseAppPath)
else:
    app.mount(
        "/app/assets",
        StaticFiles(directory=Path(root_home, "assets")),
        name="static",
    )
    templates = Jinja2Templates(directory=root_home)

    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon():
        return FileResponse(path=Path(root_home, "favicon.ico"))

    @app.get("/loader.css", include_in_schema=False)
    async def loader():
        return FileResponse(path=Path(root_home, "loader.css"))

    @app.get("/", response_class=HTMLResponse)
    async def read_root(request: Request):
        return RedirectResponse(url="/app", status_code=status.HTTP_302_FOUND)

    @app.get("/app/", response_class=HTMLResponse)
    async def read_root2(request: Request):
        return templates.TemplateResponse(
            "index.html", {"request": request, "message": "Hello, World!"}
        )

    @app.get("/app/{full_path:path}", response_class=HTMLResponse)
    async def read_root3(request: Request, full_path: str):
        if full_path == "loader.css":
            return FileResponse(path=Path(root_home, "loader.css"))
        elif full_path == "favicon.ico":
            return FileResponse(path=Path(root_home, "favicon.ico"))
        else:
            return templates.TemplateResponse(
                "index.html", {"request": request, "message": "Hello, World!"}
            )


@app.get("/api/apiinfo", response_class=HTMLResponse)
async def apiinfo(request: Request):

    return json.dumps({"port": port, "rootApp": basePath.baseAppPath})


def main():
    config = uvicorn.Config(app, host="127.0.0.1", port=int(port), log_level="info")
    server = uvicorn.Server(config)
    server.run()


if __name__ == "__main__":
    multiprocessing.freeze_support()
    gcColl.freeze()
    main()
