from datetime import datetime

from pydantic import BaseModel


class ProjectBase(BaseModel):
    id: int
    name: str
    description: str | None = None
    path: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        orm_mode = True


class ProjectUpdate(BaseModel):
    id: int | None = None
    name: str
    description: str | None = None
    path: str

    class Config:
        orm_mode = True


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    path: str


class Project(ProjectBase):
    id: int

    class Config:
        orm_mode = True
