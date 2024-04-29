from typing import List, Optional

from pydantic import BaseModel


class TableSort(BaseModel):
    key: str
    order: Optional[str] = None


class TableRequest(BaseModel):
    page: int
    itemsPerPage: int
    sortBy: List[TableSort]
    search: Optional[str] = None
