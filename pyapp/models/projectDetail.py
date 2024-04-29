from sqlalchemy import (
    DOUBLE,
    JSON,
    SMALLINT,
    TIMESTAMP,
    VARCHAR,
    Column,
    ForeignKey,
    Integer,
    Text,
    text,
)
from sqlalchemy.orm import mapped_column

from ..database.projdb import BaseProj


class GenConf(BaseProj):
    __tablename__ = "genconf"

    id = Column(Integer, primary_key=True, index=True)
    Tipe = Column(SMALLINT, nullable=False)
    reference_year = Column(Integer, nullable=False)  # Discount Rate Start Year
    discount_rate = Column(DOUBLE, nullable=False)  # Discount Rate %
    inflation_rate_applied_to = Column(
        SMALLINT, nullable=False
    )  # Inflation Rate Applied to
    start_date = Column(TIMESTAMP, nullable=False)  # Project Start Date (timestamp)
    end_date = Column(TIMESTAMP, nullable=False)  #  Project End Date (timestamp)
    start_date_2nd = Column(
        TIMESTAMP, nullable=False
    )  # Project Start Date (timestamp),  Transition Contract Only
    end_date_2nd = Column(
        TIMESTAMP, nullable=False
    )  #  Project End Date (timestamp), Transition Contract Only


class FiscalConf(BaseProj):
    __tablename__ = "fiscalconf"
    id = Column(Integer, primary_key=True, index=True)
    gid = mapped_column(
        Integer, ForeignKey("GenConf.id", ondelete="CASCADE", onupdate="CASCADE")
    )
    type = Column(SMALLINT, nullable=False)  # 0 = 1st contract 1 = 2nd contract
    Unrec = Column(DOUBLE, nullable=False)  # for 2nd project only
    Tax = Column(
        JSON,
        nullable=False,
        server_default=text(
            r"{tax_regime: 0, tax_rate:42.0, values:[]}"
        ),  # multi {year, value}
    )
    ftp_tax_regime = Column(SMALLINT, nullable=False)  # Tax of PSC Cost Recovery
    future_rate = Column(DOUBLE, nullable=False)  # ASR Future Rate
    Depreciation = Column(
        JSON,
        nullable=False,
        server_default=text(r"{depr_method:0, decline_factor: 0.1}"),
    )
    Inflation = Column(
        JSON,
        nullable=False,
        server_default=text(r"{mode:0, inflation_rate: 0.0, values:[]}"),
    )  # multi {year, value}
    VAT = Column(
        JSON,
        nullable=False,
        server_default=text(r"{mode:0, vat_rate: 0.0, values:[]}"),
    )  # multi {year, value}
    LBT = Column(
        JSON,
        nullable=False,
        server_default=text(r"{mode:0, lbt_rate: 0.0, values:[]}"),
    )  # multi {year, value}
    vat_discount = Column(DOUBLE, nullable=False)  # VAT and LBT Discount Configuration
    lbt_discount = Column(DOUBLE, nullable=False)  # VAT and LBT Discount Configuration
    npv_mode = Column(SMALLINT, nullable=False)
    discounting_mode = Column(SMALLINT, nullable=False)
    sulfur_revenue = Column(SMALLINT, nullable=False)
    electricity_revenue = Column(SMALLINT, nullable=False)
    co2_revenue = Column(SMALLINT, nullable=False)

    sunk_cost_reference_year = Column(Integer, nullable=False)
