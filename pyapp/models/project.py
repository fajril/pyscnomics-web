from sqlalchemy import TIMESTAMP, VARCHAR, Column, Integer, Text, text

from ..database.db import Base


class Project(Base):
    __tablename__ = "Projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(VARCHAR(100), nullable=False)
    description = Column(Text, nullable=True)
    path = Column(Text, nullable=False)
    created_at = Column(
        TIMESTAMP, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at = Column(
        TIMESTAMP,
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
