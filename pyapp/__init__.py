from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from pyscnomics.api.router import router

from .database.db import create_db_and_tables
from .routes import routerapi


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    yield


app = FastAPI(lifespan=lifespan)
app.mount("/app/assets", StaticFiles(directory="static/app/assets"), name="static")
templates = Jinja2Templates(directory="pyapp/templates")

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
app.include_router(routerapi, prefix="/webapi")


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("static/favicon.ico")


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse(
        "index.html", {"request": request, "message": "Hello, World!"}
    )


@app.get("/app/", response_class=HTMLResponse)
async def read_root2(request: Request):
    return templates.TemplateResponse(
        "index.html", {"request": request, "message": "Hello, World!"}
    )


@app.get("/app/{full_path:path}", response_class=HTMLResponse)
async def read_root3(request: Request, full_path: str):
    return templates.TemplateResponse(
        "index.html", {"request": request, "message": "Hello, World!"}
    )
