import json
import logging
import math
from typing import List

from sqlalchemy import Column, delete, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.project import MonteState, Project
from ..shemas import TableRequest
from ..shemas.project import ProjectBase, ProjectCreate, ProjectUpdate

log = logging.getLogger("uvicorn")


async def get_projects(db: AsyncSession, page: TableRequest):
    tbl = select(Project)
    if page.search:
        tbl = tbl.where(
            Project.name.ilike(text(f"'%{page.search}%'"))
            | Project.description.ilike(text(f"'%{page.search}%'"))
            | Project.path.ilike(text(f"'%{page.search}%'"))
            # | text("DATE_FORMAT(created_at, '%b %e, %Y %h:%i %p') like '%Mar%'")
            # | func.date_format(Project.updated_at, text("'%b %e, %Y %h:%i %p'")).like(
            #     text(f"'%{page.search}%'")
            # )
        )
    if len(page.sortBy):
        tbl = tbl.order_by(
            Column(page.sortBy[0].key).asc()
            if page.sortBy[0].order == "asc"
            else Column(page.sortBy[0].key).desc()
        )
    else:
        tbl = tbl.order_by(Project.name.asc())
    tblQry: List[ProjectBase] = (await db.execute(tbl)).scalars().all()
    itotal = len(tblQry)
    ipage = 1 if math.ceil(itotal / page.itemsPerPage) < page.page else page.page
    if page.itemsPerPage != -1 and itotal > page.itemsPerPage:
        tblQry: List[ProjectBase] = (
            (
                await db.execute(
                    tbl.limit(page.itemsPerPage).offset(ipage - 1 * page.itemsPerPage)
                )
            )
            .scalars()
            .all()
        )
    else:
        ipage = 1
    return {
        "total": itotal,
        "page": ipage,
        "list": tblQry,
        # [
        #     {
        #         "id": item.id,
        #         "name": item.name,
        #         "description": item.description,
        #         "path": item.path,
        #         "created_at": item.created_at,
        #         "updated_at": item.updated_at,
        #     }
        #     for item in tblQry
        # ],
    }


async def get_project(db: AsyncSession, proj_id: int):
    return (await db.execute(select(Project).filter(Project.id == proj_id))).scalar()


async def create_project(db: AsyncSession, proj: ProjectCreate):
    db_proj = Project(**proj.model_dump())
    db.add(db_proj)
    await db.commit()
    await db.refresh(db_proj)
    return await get_project(db, db_proj.id)


async def update_project(db: AsyncSession, proj: ProjectUpdate):
    stmProj = select(Project).filter(Project.id == proj.id)
    projtbl = (await db.execute(stmProj)).scalar()
    if projtbl is None:
        return False
    stmUpd = (
        update(Project)
        .filter(Project.id == proj.id)
        .values(name=proj.name, description=proj.description, path=proj.path)
        # .returning(Project.id, Project.name, Project.description, Project.path)
    )
    await db.execute(stmUpd)
    await db.commit()
    return True

async def get_monte_value(db: AsyncSession, id:int):
    stmMonte = select(MonteState).filter(MonteState.monteid == id)
    montetbl = (await db.execute(stmMonte)).scalar()
    return None if montetbl is None else montetbl.progress

async def update_monte(db: AsyncSession, id:int, value: int):
    monteState = MonteState(monteid=id, progress=value)
    stmMonte = select(MonteState).filter(MonteState.monteid == id)
    montetbl = (await db.execute(stmMonte)).scalar()
    if montetbl is None:
      db.add(monteState)
      await db.commit()
    else:
      stmUpd = (
          update(MonteState)
          .filter(MonteState.monteid == id)
          .values(progress=value)
          # .returning(Project.id, Project.name, Project.description, Project.path)
      )
      await db.execute(stmUpd)
      await db.commit()
    return True

async def delete_monte(db: AsyncSession, id:int):
  try:
    stmUpd = (
        delete(MonteState)
        .filter(MonteState.monteid == id)
    )
    await db.execute(stmUpd)
    await db.commit()
  except Exception:
    pass
        
