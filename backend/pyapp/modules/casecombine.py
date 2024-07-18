import base64
import logging
import os
import pickle
from pathlib import Path

import numpy as np
from pyscnomics.api.adapter import (
    get_costrecovery,
    get_grosssplit,
    get_transition,
)
from pyscnomics.contracts.costrecovery import CostRecovery
from pyscnomics.contracts.grossplit import GrossSplit
from pyscnomics.contracts.transition import Transition
from pyscnomics.econ.indicator import (
    irr,
    npv_nominal_terms,
    npv_point_forward,
    npv_real_terms,
    npv_skk_nominal_terms,
    npv_skk_real_terms,
    pot_psc,
)
from pyscnomics.econ.selection import DiscountingMode, NPVSelection
from pyscnomics.tools.table import get_table

log = logging.getLogger("uvicorn")


class ConcanateCase:

    C_Year: np.ndarray
    C_Lifting_Oil: np.ndarray
    C_Lifting_Gas: np.ndarray
    C_Oil_Revenue: np.ndarray
    C_Gas_Revenue: np.ndarray
    C_Revenue: np.ndarray
    C_Oil_tangible: np.ndarray
    C_Gas_tangible: np.ndarray
    C_Depreciable: np.ndarray
    C_Intangible: np.ndarray
    C_Opex: np.ndarray
    C_ASR: np.ndarray
    C_Depreciation: np.ndarray
    C_Non_Capital: np.ndarray
    C_Oil_Sunk_Cost: np.ndarray
    C_Gas_Sunk_Cost: np.ndarray
    C_Sunk_Cost: np.ndarray
    C_Total_Expenses: np.ndarray
    C_FTP: np.ndarray
    C_FTP_CTR: np.ndarray
    C_FTP_GOV: np.ndarray
    C_IC: np.ndarray
    C_Unrecovered_before_TF: np.ndarray
    C_Cost_Recovery: np.ndarray
    C_ETS_before_TF: np.ndarray
    C_Unrecovered_after_TF: np.ndarray
    C_Cost_to_be_Recovered_after_TF: np.ndarray
    C_Cost_Recovery_after_TF: np.ndarray
    C_ETS_after_TF: np.ndarray
    C_Cost_To_Be_Deducted: np.ndarray
    C_Carry_Forward_Cost: np.ndarray
    C_Deductible_Cost: np.ndarray
    C_Carry_Forward_Cost_after_TF: np.ndarray
    C_CTR_Share_After: np.ndarray
    C_CTR_Net_Operating_Profit: np.ndarray
    C_Contractor_Share: np.ndarray
    C_Government_Share: np.ndarray
    C_DMO_Volume: np.ndarray
    C_DMO_Fee: np.ndarray
    C_DDMO: np.ndarray
    C_Taxable_Income: np.ndarray
    C_Tax_Due: np.ndarray
    C_Unpaid_Tax_Balance: np.ndarray
    C_Tax_Payment: np.ndarray
    C_CTR_Net_Share: np.ndarray
    C_Contractor_Take: np.ndarray
    C_Cashflow: np.ndarray
    C_Cum_Cashflow: np.ndarray
    C_Government_Take: np.ndarray

    def __init__(
        self,
        min: int = 0,
        max: int = 0,
        C_Year: np.ndarray | None = None,
        C_Lifting_Oil: np.ndarray | None = None,
        C_Lifting_Gas: np.ndarray | None = None,
        C_Oil_Revenue: np.ndarray | None = None,
        C_Gas_Revenue: np.ndarray | None = None,
        C_Revenue: np.ndarray | None = None,
        C_Oil_tangible: np.ndarray | None = None,
        C_Gas_tangible: np.ndarray | None = None,
        C_Depreciable: np.ndarray | None = None,
        C_Intangible: np.ndarray | None = None,
        C_Opex: np.ndarray | None = None,
        C_ASR: np.ndarray | None = None,
        C_Depreciation: np.ndarray | None = None,
        C_Non_Capital: np.ndarray | None = None,
        C_Oil_Sunk_Cost: np.ndarray | None = None,
        C_Gas_Sunk_Cost: np.ndarray | None = None,
        C_Sunk_Cost: np.ndarray | None = None,
        C_Total_Expenses: np.ndarray | None = None,
        C_FTP: np.ndarray | None = None,
        C_FTP_CTR: np.ndarray | None = None,
        C_FTP_GOV: np.ndarray | None = None,
        C_IC: np.ndarray | None = None,
        C_Unrecovered_before_TF: np.ndarray | None = None,
        C_Cost_Recovery: np.ndarray | None = None,
        C_ETS_before_TF: np.ndarray | None = None,
        C_Unrecovered_after_TF: np.ndarray | None = None,
        C_Cost_to_be_Recovered_after_TF: np.ndarray | None = None,
        C_Cost_Recovery_after_TF: np.ndarray | None = None,
        C_ETS_after_TF: np.ndarray | None = None,
        C_Cost_To_Be_Deducted: np.ndarray | None = None,
        C_Carry_Forward_Cost: np.ndarray | None = None,
        C_Deductible_Cost: np.ndarray | None = None,
        C_Carry_Forward_Cost_after_TF: np.ndarray | None = None,
        C_CTR_Share_After: np.ndarray | None = None,
        C_CTR_Net_Operating_Profit: np.ndarray | None = None,
        C_Contractor_Share: np.ndarray | None = None,
        C_Government_Share: np.ndarray | None = None,
        C_DMO_Volume: np.ndarray | None = None,
        C_DMO_Fee: np.ndarray | None = None,
        C_DDMO: np.ndarray | None = None,
        C_Taxable_Income: np.ndarray | None = None,
        C_Tax_Due: np.ndarray | None = None,
        C_Unpaid_Tax_Balance: np.ndarray | None = None,
        C_Tax_Payment: np.ndarray | None = None,
        C_CTR_Net_Share: np.ndarray | None = None,
        C_Contractor_Take: np.ndarray | None = None,
        C_Cashflow: np.ndarray | None = None,
        C_Cum_Cashflow: np.ndarray | None = None,
        C_Government_Take: np.ndarray | None = None,
    ):
        len = max - min + 1
        self.C_Year = (
            C_Year if C_Year is not None else np.arange(min, max + 1, 1, dtype=int)
        )
        self.C_Lifting_Oil = (
            C_Lifting_Oil if C_Lifting_Oil is not None else np.zeros(len, dtype=float)
        )
        self.C_Lifting_Gas = (
            C_Lifting_Gas if C_Lifting_Gas is not None else np.zeros(len, dtype=float)
        )
        self.C_Oil_Revenue = (
            C_Oil_Revenue if C_Oil_Revenue is not None else np.zeros(len, dtype=float)
        )
        self.C_Gas_Revenue = (
            C_Gas_Revenue if C_Gas_Revenue is not None else np.zeros(len, dtype=float)
        )
        self.C_Revenue = (
            C_Revenue if C_Revenue is not None else np.zeros(len, dtype=float)
        )
        self.C_Oil_tangible = (
            C_Oil_tangible if C_Oil_tangible is not None else np.zeros(len, dtype=float)
        )
        self.C_Gas_tangible = (
            C_Gas_tangible if C_Gas_tangible is not None else np.zeros(len, dtype=float)
        )
        self.C_Depreciable = (
            C_Depreciable if C_Depreciable is not None else np.zeros(len, dtype=float)
        )
        self.C_Intangible = (
            C_Intangible if C_Intangible is not None else np.zeros(len, dtype=float)
        )
        self.C_Opex = C_Opex if C_Opex is not None else np.zeros(len, dtype=float)
        self.C_ASR = C_ASR if C_ASR is not None else np.zeros(len, dtype=float)
        self.C_Depreciation = (
            C_Depreciation if C_Depreciation is not None else np.zeros(len, dtype=float)
        )
        self.C_Non_Capital = (
            C_Non_Capital if C_Non_Capital is not None else np.zeros(len, dtype=float)
        )
        self.C_Oil_Sunk_Cost = (
            C_Oil_Sunk_Cost
            if C_Oil_Sunk_Cost is not None
            else np.zeros(len, dtype=float)
        )
        self.C_Gas_Sunk_Cost = (
            C_Gas_Sunk_Cost
            if C_Gas_Sunk_Cost is not None
            else np.zeros(len, dtype=float)
        )
        self.C_Sunk_Cost = (
            C_Sunk_Cost if C_Sunk_Cost is not None else np.zeros(len, dtype=float)
        )
        self.C_Total_Expenses = (
            C_Total_Expenses
            if C_Total_Expenses is not None
            else np.zeros(len, dtype=float)
        )
        self.C_FTP = C_FTP if C_FTP is not None else np.zeros(len, dtype=float)
        self.C_FTP_CTR = (
            C_FTP_CTR if C_FTP_CTR is not None else np.zeros(len, dtype=float)
        )
        self.C_FTP_GOV = (
            C_FTP_GOV if C_FTP_GOV is not None else np.zeros(len, dtype=float)
        )
        self.C_IC = C_IC if C_IC is not None else np.zeros(len, dtype=float)
        self.C_Unrecovered_before_TF = (
            C_Unrecovered_before_TF
            if C_Unrecovered_before_TF is not None
            else np.zeros(len, dtype=float)
        )
        self.C_Cost_Recovery = (
            C_Cost_Recovery
            if C_Cost_Recovery is not None
            else np.zeros(len, dtype=float)
        )
        self.C_ETS_before_TF = (
            C_ETS_before_TF
            if C_ETS_before_TF is not None
            else np.zeros(len, dtype=float)
        )
        self.C_Unrecovered_after_TF = (
            C_Unrecovered_after_TF
            if C_Unrecovered_after_TF is not None
            else np.zeros(len, dtype=float)
        )
        self.C_Cost_to_be_Recovered_after_TF = (
            C_Cost_to_be_Recovered_after_TF
            if C_Cost_to_be_Recovered_after_TF is not None
            else np.zeros(len, dtype=float)
        )
        self.C_Cost_Recovery_after_TF = (
            C_Cost_Recovery_after_TF
            if C_Cost_Recovery_after_TF is not None
            else np.zeros(len, dtype=float)
        )
        self.C_ETS_after_TF = (
            C_ETS_after_TF if C_ETS_after_TF is not None else np.zeros(len, dtype=float)
        )
        self.C_Cost_To_Be_Deducted = (
            C_Cost_To_Be_Deducted
            if C_Cost_To_Be_Deducted is not None
            else np.zeros(len, dtype=float)
        )
        self.C_Carry_Forward_Cost = (
            C_Carry_Forward_Cost
            if C_Carry_Forward_Cost is not None
            else np.zeros(len, dtype=float)
        )
        self.C_Deductible_Cost = (
            C_Deductible_Cost
            if C_Deductible_Cost is not None
            else np.zeros(len, dtype=float)
        )
        self.C_Carry_Forward_Cost_after_TF = (
            C_Carry_Forward_Cost_after_TF
            if C_Carry_Forward_Cost_after_TF is not None
            else np.zeros(len, dtype=float)
        )
        self.C_CTR_Share_After = (
            C_CTR_Share_After
            if C_CTR_Share_After is not None
            else np.zeros(len, dtype=float)
        )
        self.C_CTR_Net_Operating_Profit = (
            C_CTR_Net_Operating_Profit
            if C_CTR_Net_Operating_Profit is not None
            else np.zeros(len, dtype=float)
        )
        self.C_Contractor_Share = (
            C_Contractor_Share
            if C_Contractor_Share is not None
            else np.zeros(len, dtype=float)
        )
        self.C_Government_Share = (
            C_Government_Share
            if C_Government_Share is not None
            else np.zeros(len, dtype=float)
        )
        self.C_DMO_Volume = (
            C_DMO_Volume if C_DMO_Volume is not None else np.zeros(len, dtype=float)
        )
        self.C_DMO_Fee = (
            C_DMO_Fee if C_DMO_Fee is not None else np.zeros(len, dtype=float)
        )
        self.C_DDMO = C_DDMO if C_DDMO is not None else np.zeros(len, dtype=float)
        self.C_Taxable_Income = (
            C_Taxable_Income
            if C_Taxable_Income is not None
            else np.zeros(len, dtype=float)
        )
        self.C_Tax_Due = (
            C_Tax_Due if C_Tax_Due is not None else np.zeros(len, dtype=float)
        )
        self.C_Unpaid_Tax_Balance = (
            C_Unpaid_Tax_Balance
            if C_Unpaid_Tax_Balance is not None
            else np.zeros(len, dtype=float)
        )
        self.C_Tax_Payment = (
            C_Tax_Payment if C_Tax_Payment is not None else np.zeros(len, dtype=float)
        )
        self.C_CTR_Net_Share = (
            C_CTR_Net_Share
            if C_CTR_Net_Share is not None
            else np.zeros(len, dtype=float)
        )
        self.C_Contractor_Take = (
            C_Contractor_Take
            if C_Contractor_Take is not None
            else np.zeros(len, dtype=float)
        )
        self.C_Cashflow = (
            C_Cashflow if C_Cashflow is not None else np.zeros(len, dtype=float)
        )
        self.C_Cum_Cashflow = (
            C_Cum_Cashflow if C_Cum_Cashflow is not None else np.zeros(len, dtype=float)
        )
        self.C_Government_Take = (
            C_Government_Take
            if C_Government_Take is not None
            else np.zeros(len, dtype=float)
        )

    def apply(
        self,
        ctrType: np.ndarray,
        summ: dict | None = None,
        years: list | None = None,
    ):
        if summ is not None:
            year_ = np.array(list(summ["C_Year"]))
            lenY_ = len(year_)
            hasCR = np.in1d(1, ctrType)[0]
            hasGS = np.in1d(2, ctrType)[0]
            return ConcanateCase(
                0,
                0,
                C_Year=year_,
                C_Lifting_Oil=np.array(list(summ["C_Lifting_Oil"])),
                C_Lifting_Gas=np.array(list(summ["C_Lifting_Gas"])),
                C_Oil_Revenue=np.array(list(summ["C_Oil_Revenue"])),
                C_Gas_Revenue=np.array(list(summ["C_Gas_Revenue"])),
                C_Revenue=np.array(list(summ["C_Revenue"])),
                C_Oil_tangible=np.array(list(summ["C_Oil_tangible"])),
                C_Gas_tangible=np.array(list(summ["C_Gas_tangible"])),
                C_Depreciable=np.array(list(summ["C_Depreciable"])),
                C_Intangible=np.array(list(summ["C_Intangible"])),
                C_Opex=np.array(list(summ["C_Opex"])),
                C_ASR=np.array(list(summ["C_ASR"])),
                C_Depreciation=np.array(list(summ["C_Depreciation"])),
                C_Non_Capital=np.array(list(summ["C_Non_Capital"])),
                C_Oil_Sunk_Cost=np.array(list(summ["C_Oil_Sunk_Cost"])),
                C_Gas_Sunk_Cost=np.array(list(summ["C_Gas_Sunk_Cost"])),
                C_Sunk_Cost=np.array(list(summ["C_Sunk_Cost"])),
                C_Total_Expenses=np.array(list(summ["C_Total_Expenses"])),
                # CostRecovery Section
                C_FTP=(
                    np.array(list(summ["C_FTP"]))
                    if hasCR
                    else np.zeros(lenY_, dtype=float)
                ),
                C_FTP_CTR=(
                    np.array(list(summ["C_FTP_CTR"]))
                    if hasCR
                    else np.zeros(lenY_, dtype=float)
                ),
                C_FTP_GOV=(
                    np.array(list(summ["C_FTP_GOV"]))
                    if hasCR
                    else np.zeros(lenY_, dtype=float)
                ),
                C_IC=(
                    np.array(list(summ["C_IC"]))
                    if hasCR
                    else np.zeros(lenY_, dtype=float)
                ),
                C_Unrecovered_before_TF=(
                    np.array(list(summ["C_Unrecovered_before_TF"]))
                    if hasCR
                    else np.zeros(lenY_, dtype=float)
                ),
                C_Cost_Recovery=(
                    np.array(list(summ["C_Cost_Recovery"]))
                    if hasCR
                    else np.zeros(lenY_, dtype=float)
                ),
                C_ETS_before_TF=(
                    np.array(list(summ["C_ETS_before_TF"]))
                    if hasCR
                    else np.zeros(lenY_, dtype=float)
                ),
                C_Unrecovered_after_TF=(
                    np.array(list(summ["C_Unrecovered_after_TF"]))
                    if hasCR
                    else np.zeros(lenY_, dtype=float)
                ),
                C_Cost_to_be_Recovered_after_TF=(
                    np.array(list(summ["C_Cost_to_be_Recovered_after_TF"]))
                    if hasCR
                    else np.zeros(lenY_, dtype=float)
                ),
                C_Cost_Recovery_after_TF=(
                    np.array(list(summ["C_Cost_Recovery_after_TF"]))
                    if hasCR
                    else np.zeros(lenY_, dtype=float)
                ),
                C_ETS_after_TF=(
                    np.array(list(summ["C_ETS_after_TF"]))
                    if hasCR
                    else np.zeros(lenY_, dtype=float)
                ),
                # ------------------
                # GrossSplit Section
                C_Cost_To_Be_Deducted=(
                    np.array(list(summ["C_Cost_To_Be_Deducted"]))
                    if hasGS
                    else np.zeros(lenY_, dtype=float)
                ),
                C_Carry_Forward_Cost=(
                    np.array(list(summ["C_Carry_Forward_Cost"]))
                    if hasGS
                    else np.zeros(lenY_, dtype=float)
                ),
                C_Deductible_Cost=(
                    np.array(list(summ["C_Deductible_Cost"]))
                    if hasGS
                    else np.zeros(lenY_, dtype=float)
                ),
                C_Carry_Forward_Cost_after_TF=(
                    np.array(list(summ["C_Carry_Forward_Cost_after_TF"]))
                    if hasGS
                    else np.zeros(lenY_, dtype=float)
                ),
                C_CTR_Share_After=(
                    np.array(list(summ["C_CTR_Share_After"]))
                    if hasGS
                    else np.zeros(lenY_, dtype=float)
                ),
                C_CTR_Net_Operating_Profit=(
                    np.array(list(summ["C_CTR_Net_Operating_Profit"]))
                    if hasGS
                    else np.zeros(lenY_, dtype=float)
                ),
                # ------------------
                C_Contractor_Share=np.array(list(summ["C_Contractor_Share"])),
                C_Government_Share=np.array(list(summ["C_Government_Share"])),
                C_DMO_Volume=np.array(list(summ["C_DMO_Volume"])),
                C_DMO_Fee=np.array(list(summ["C_DMO_Fee"])),
                C_DDMO=np.array(list(summ["C_DDMO"])),
                C_Taxable_Income=np.array(list(summ["C_Taxable_Income"])),
                # CostRecovery Section
                C_Tax_Due=(
                    np.array(list(summ["C_Tax_Due"]))
                    if hasCR
                    else np.zeros(lenY_, dtype=float)
                ),
                C_Unpaid_Tax_Balance=(
                    np.array(list(summ["C_Unpaid_Tax_Balance"]))
                    if hasCR
                    else np.zeros(lenY_, dtype=float)
                ),
                # ------------------
                C_Tax_Payment=np.array(list(summ["C_Tax_Payment"])),
                C_CTR_Net_Share=np.array(list(summ["C_CTR_Net_Share"])),
                C_Contractor_Take=np.array(list(summ["C_Contractor_Take"])),
                C_Cashflow=np.array(list(summ["C_Cashflow"])),
                C_Cum_Cashflow=np.array(list(summ["C_Cum_Cashflow"])),
                C_Government_Take=np.array(list(summ["C_Government_Take"])),
            )
        elif years is not None:
            return ConcanateCase(years[0], years[1])
        return ConcanateCase()

    def make_CostRecovery(self, contract: CostRecovery):
        return ConcanateCase(
            0,
            0,
            C_Year=contract.project_years,
            C_Lifting_Oil=contract._oil_lifting.get_lifting_rate_arr(),
            C_Lifting_Gas=contract._gas_lifting.get_lifting_rate_arr(),
            C_Oil_Revenue=contract._oil_revenue,
            C_Gas_Revenue=contract._gas_revenue,
            C_Revenue=contract._consolidated_revenue,
            C_Oil_tangible=contract._oil_capital_expenditures,
            C_Gas_tangible=contract._gas_capital_expenditures,
            C_Depreciable=contract._consolidated_capital_cost,
            C_Intangible=contract._consolidated_intangible,
            C_Opex=contract._consolidated_opex,
            C_ASR=contract._consolidated_asr,
            C_Depreciation=contract._consolidated_depreciation,
            C_Non_Capital=contract._consolidated_non_capital,
            C_Oil_Sunk_Cost=np.concatenate(
                (
                    contract._oil_sunk_cost,
                    np.zeros(
                        len(contract.project_years)
                        - len(contract._consolidated_sunk_cost)
                    ),
                )
            ),
            C_Gas_Sunk_Cost=np.concatenate(
                (
                    contract._gas_sunk_cost,
                    np.zeros(
                        len(contract.project_years)
                        - len(contract._consolidated_sunk_cost)
                    ),
                )
            ),
            C_Sunk_Cost=np.concatenate(
                (
                    contract._consolidated_sunk_cost,
                    np.zeros(
                        len(contract.project_years)
                        - len(contract._consolidated_sunk_cost)
                    ),
                )
            ),
            C_Total_Expenses=contract._consolidated_capital_cost
            + contract._consolidated_intangible
            + contract._consolidated_opex
            + contract._consolidated_asr,
            C_FTP=contract._consolidated_ftp,
            C_FTP_CTR=contract._consolidated_ftp_ctr,
            C_FTP_GOV=contract._consolidated_ftp_gov,
            C_IC=contract._consolidated_ic,
            C_Unrecovered_before_TF=contract._consolidated_unrecovered_before_transfer,
            C_Cost_Recovery=contract._consolidated_cost_recovery_before_transfer,
            C_ETS_before_TF=contract._consolidated_ets_before_transfer,
            C_Unrecovered_after_TF=contract._consolidated_unrecovered_after_transfer,
            C_Cost_to_be_Recovered_after_TF=contract._consolidated_cost_to_be_recovered_after_tf,
            C_Cost_Recovery_after_TF=contract._consolidated_cost_recovery_after_tf,
            C_ETS_after_TF=contract._consolidated_ets_after_transfer,
            C_Cost_To_Be_Deducted=np.zeros_like(contract.project_years, dtype=float),
            C_Carry_Forward_Cost=np.zeros_like(contract.project_years, dtype=float),
            C_Deductible_Cost=np.zeros_like(contract.project_years, dtype=float),
            C_Carry_Forward_Cost_after_TF=np.zeros_like(
                contract.project_years, dtype=float
            ),
            C_CTR_Share_After=np.zeros_like(contract.project_years, dtype=float),
            C_CTR_Net_Operating_Profit=np.zeros_like(
                contract.project_years, dtype=float
            ),
            C_Contractor_Share=contract._consolidated_contractor_share,
            C_Government_Share=contract._consolidated_government_share,
            C_DMO_Volume=contract._consolidated_dmo_volume,
            C_DMO_Fee=contract._consolidated_dmo_fee,
            C_DDMO=contract._consolidated_ddmo,
            C_Taxable_Income=contract._consolidated_taxable_income,
            C_Tax_Due=contract._consolidated_tax_due,
            C_Unpaid_Tax_Balance=contract._consolidated_unpaid_tax_balance,
            C_Tax_Payment=contract._consolidated_tax_payment,
            C_CTR_Net_Share=contract._consolidated_ctr_net_share,
            C_Contractor_Take=contract._consolidated_contractor_take,
            C_Cashflow=contract._consolidated_cashflow,
            C_Cum_Cashflow=np.cumsum(contract._consolidated_cashflow),
            C_Government_Take=contract._consolidated_government_take,
        )

    def make_GrossSplit(self, contract: GrossSplit):
        return ConcanateCase(
            0,
            0,
            C_Year=contract.project_years,
            C_Lifting_Oil=contract._oil_lifting.get_lifting_rate_arr(),
            C_Lifting_Gas=contract._gas_lifting.get_lifting_rate_arr(),
            C_Oil_Revenue=contract._oil_revenue,
            C_Gas_Revenue=contract._gas_revenue,
            C_Revenue=contract._consolidated_revenue,
            C_Oil_tangible=contract._oil_capital_expenditures,
            C_Gas_tangible=contract._gas_capital_expenditures,
            C_Depreciable=contract._consolidated_capital_cost,
            C_Intangible=contract._consolidated_intangible,
            C_Opex=contract._consolidated_opex,
            C_ASR=contract._consolidated_asr,
            C_Depreciation=contract._consolidated_depreciation,
            C_Non_Capital=contract._consolidated_non_capital,
            C_Oil_Sunk_Cost=np.concatenate(
                (
                    contract._oil_sunk_cost,
                    np.zeros(
                        len(contract.project_years)
                        - len(contract._consolidated_sunk_cost)
                    ),
                )
            ),
            C_Gas_Sunk_Cost=np.concatenate(
                (
                    contract._gas_sunk_cost,
                    np.zeros(
                        len(contract.project_years)
                        - len(contract._consolidated_sunk_cost)
                    ),
                )
            ),
            C_Sunk_Cost=np.concatenate(
                (
                    contract._consolidated_sunk_cost,
                    np.zeros(
                        len(contract.project_years)
                        - len(contract._consolidated_sunk_cost)
                    ),
                )
            ),
            C_Total_Expenses=contract._consolidated_total_expenses,
            C_FTP=np.zeros_like(contract.project_years, dtype=float),
            C_FTP_CTR=np.zeros_like(contract.project_years, dtype=float),
            C_FTP_GOV=np.zeros_like(contract.project_years, dtype=float),
            C_IC=np.zeros_like(contract.project_years, dtype=float),
            C_Unrecovered_before_TF=np.zeros_like(contract.project_years, dtype=float),
            C_Cost_Recovery=np.zeros_like(contract.project_years, dtype=float),
            C_ETS_before_TF=np.zeros_like(contract.project_years, dtype=float),
            C_Unrecovered_after_TF=np.zeros_like(contract.project_years, dtype=float),
            C_Cost_to_be_Recovered_after_TF=np.zeros_like(
                contract.project_years, dtype=float
            ),
            C_Cost_Recovery_after_TF=np.zeros_like(contract.project_years, dtype=float),
            C_ETS_after_TF=np.zeros_like(contract.project_years, dtype=float),
            C_Cost_To_Be_Deducted=contract._consolidated_cost_tobe_deducted,
            C_Carry_Forward_Cost=contract._consolidated_carward_deduct_cost,
            C_Deductible_Cost=contract._consolidated_deductible_cost,
            C_Carry_Forward_Cost_after_TF=contract._consolidated_carward_cost_aftertf,
            C_CTR_Share_After=contract._consolidated_ctr_share_after_transfer,
            C_CTR_Net_Operating_Profit=contract._consolidated_net_operating_profit,
            C_Contractor_Share=contract._consolidated_gov_share_before_tf,
            C_Government_Share=contract._consolidated_ctr_share_before_tf,
            C_DMO_Volume=contract._consolidated_dmo_volume,
            C_DMO_Fee=contract._consolidated_dmo_fee,
            C_DDMO=contract._consolidated_ddmo,
            C_Taxable_Income=contract._consolidated_taxable_income,
            C_Tax_Due=np.zeros_like(contract.project_years, dtype=float),
            C_Unpaid_Tax_Balance=np.zeros_like(contract.project_years, dtype=float),
            C_Tax_Payment=contract._consolidated_tax_payment,
            C_CTR_Net_Share=contract._consolidated_ctr_net_share,
            C_Contractor_Take=(
                contract._consolidated_taxable_income
                - contract._consolidated_tax_payment
            ),
            C_Cashflow=contract._consolidated_cashflow,
            C_Cum_Cashflow=np.cumsum(contract._consolidated_cashflow),
            C_Government_Take=contract._consolidated_government_take,
        )

    def __add__(self, other):
        if isinstance(other, ConcanateCase):
            minC = np.min(other.C_Year)
            maxC = np.max(other.C_Year)
            cur_minC = np.min(self.C_Year)
            cur_maxC = np.max(self.C_Year)
            new_min = min(minC, cur_minC)
            new_max = max(maxC, cur_maxC)
            new_Year = np.arange(new_min, new_max + 1, 1)
            len_Year = len(new_Year)
            indices0 = np.flatnonzero(np.in1d(new_Year, self.C_Year))
            indices1 = np.flatnonzero(np.in1d(new_Year, other.C_Year))

            return ConcanateCase(
                0,
                0,
                new_Year,
                self.Arrange(len_Year, indices0, self.C_Lifting_Oil)
                + self.Arrange(len_Year, indices1, other.C_Lifting_Oil),
                self.Arrange(len_Year, indices0, self.C_Lifting_Gas)
                + self.Arrange(len_Year, indices1, other.C_Lifting_Gas),
                self.Arrange(len_Year, indices0, self.C_Oil_Revenue)
                + self.Arrange(len_Year, indices1, other.C_Oil_Revenue),
                self.Arrange(len_Year, indices0, self.C_Gas_Revenue)
                + self.Arrange(len_Year, indices1, other.C_Gas_Revenue),
                self.Arrange(len_Year, indices0, self.C_Revenue)
                + self.Arrange(len_Year, indices1, other.C_Revenue),
                self.Arrange(len_Year, indices0, self.C_Oil_tangible)
                + self.Arrange(len_Year, indices1, other.C_Oil_tangible),
                self.Arrange(len_Year, indices0, self.C_Gas_tangible)
                + self.Arrange(len_Year, indices1, other.C_Gas_tangible),
                self.Arrange(len_Year, indices0, self.C_Depreciable)
                + self.Arrange(len_Year, indices1, other.C_Depreciable),
                self.Arrange(len_Year, indices0, self.C_Intangible)
                + self.Arrange(len_Year, indices1, other.C_Intangible),
                self.Arrange(len_Year, indices0, self.C_Opex)
                + self.Arrange(len_Year, indices1, other.C_Opex),
                self.Arrange(len_Year, indices0, self.C_ASR)
                + self.Arrange(len_Year, indices1, other.C_ASR),
                self.Arrange(len_Year, indices0, self.C_Depreciation)
                + self.Arrange(len_Year, indices1, other.C_Depreciation),
                self.Arrange(len_Year, indices0, self.C_Non_Capital)
                + self.Arrange(len_Year, indices1, other.C_Non_Capital),
                self.Arrange(len_Year, indices0, self.C_Oil_Sunk_Cost)
                + self.Arrange(len_Year, indices1, other.C_Oil_Sunk_Cost),
                self.Arrange(len_Year, indices0, self.C_Gas_Sunk_Cost)
                + self.Arrange(len_Year, indices1, other.C_Gas_Sunk_Cost),
                self.Arrange(len_Year, indices0, self.C_Sunk_Cost)
                + self.Arrange(len_Year, indices1, other.C_Sunk_Cost),
                self.Arrange(len_Year, indices0, self.C_Total_Expenses)
                + self.Arrange(len_Year, indices1, other.C_Total_Expenses),
                self.Arrange(len_Year, indices0, self.C_FTP)
                + self.Arrange(len_Year, indices1, other.C_FTP),
                self.Arrange(len_Year, indices0, self.C_FTP_CTR)
                + self.Arrange(len_Year, indices1, other.C_FTP_CTR),
                self.Arrange(len_Year, indices0, self.C_FTP_GOV)
                + self.Arrange(len_Year, indices1, other.C_FTP_GOV),
                self.Arrange(len_Year, indices0, self.C_IC)
                + self.Arrange(len_Year, indices1, other.C_IC),
                self.Arrange(len_Year, indices0, self.C_Unrecovered_before_TF)
                + self.Arrange(len_Year, indices1, other.C_Unrecovered_before_TF),
                self.Arrange(len_Year, indices0, self.C_Cost_Recovery)
                + self.Arrange(len_Year, indices1, other.C_Cost_Recovery),
                self.Arrange(len_Year, indices0, self.C_ETS_before_TF)
                + self.Arrange(len_Year, indices1, other.C_ETS_before_TF),
                self.Arrange(len_Year, indices0, self.C_Unrecovered_after_TF)
                + self.Arrange(len_Year, indices1, other.C_Unrecovered_after_TF),
                self.Arrange(len_Year, indices0, self.C_Cost_to_be_Recovered_after_TF)
                + self.Arrange(
                    len_Year, indices1, other.C_Cost_to_be_Recovered_after_TF
                ),
                self.Arrange(len_Year, indices0, self.C_Cost_Recovery_after_TF)
                + self.Arrange(len_Year, indices1, other.C_Cost_Recovery_after_TF),
                self.Arrange(len_Year, indices0, self.C_ETS_after_TF)
                + self.Arrange(len_Year, indices1, other.C_ETS_after_TF),
                self.Arrange(len_Year, indices0, self.C_Cost_To_Be_Deducted)
                + self.Arrange(len_Year, indices1, other.C_Cost_To_Be_Deducted),
                self.Arrange(len_Year, indices0, self.C_Carry_Forward_Cost)
                + self.Arrange(len_Year, indices1, other.C_Carry_Forward_Cost),
                self.Arrange(len_Year, indices0, self.C_Deductible_Cost)
                + self.Arrange(len_Year, indices1, other.C_Deductible_Cost),
                self.Arrange(len_Year, indices0, self.C_Carry_Forward_Cost_after_TF)
                + self.Arrange(len_Year, indices1, other.C_Carry_Forward_Cost_after_TF),
                self.Arrange(len_Year, indices0, self.C_CTR_Share_After)
                + self.Arrange(len_Year, indices1, other.C_CTR_Share_After),
                self.Arrange(len_Year, indices0, self.C_CTR_Net_Operating_Profit)
                + self.Arrange(len_Year, indices1, other.C_CTR_Net_Operating_Profit),
                self.Arrange(len_Year, indices0, self.C_Contractor_Share)
                + self.Arrange(len_Year, indices1, other.C_Contractor_Share),
                self.Arrange(len_Year, indices0, self.C_Government_Share)
                + self.Arrange(len_Year, indices1, other.C_Government_Share),
                self.Arrange(len_Year, indices0, self.C_DMO_Volume)
                + self.Arrange(len_Year, indices1, other.C_DMO_Volume),
                self.Arrange(len_Year, indices0, self.C_DMO_Fee)
                + self.Arrange(len_Year, indices1, other.C_DMO_Fee),
                self.Arrange(len_Year, indices0, self.C_DDMO)
                + self.Arrange(len_Year, indices1, other.C_DDMO),
                self.Arrange(len_Year, indices0, self.C_Taxable_Income)
                + self.Arrange(len_Year, indices1, other.C_Taxable_Income),
                self.Arrange(len_Year, indices0, self.C_Tax_Due)
                + self.Arrange(len_Year, indices1, other.C_Tax_Due),
                self.Arrange(len_Year, indices0, self.C_Unpaid_Tax_Balance)
                + self.Arrange(len_Year, indices1, other.C_Unpaid_Tax_Balance),
                self.Arrange(len_Year, indices0, self.C_Tax_Payment)
                + self.Arrange(len_Year, indices1, other.C_Tax_Payment),
                self.Arrange(len_Year, indices0, self.C_CTR_Net_Share)
                + self.Arrange(len_Year, indices1, other.C_CTR_Net_Share),
                self.Arrange(len_Year, indices0, self.C_Contractor_Take)
                + self.Arrange(len_Year, indices1, other.C_Contractor_Take),
                self.Arrange(len_Year, indices0, self.C_Cashflow)
                + self.Arrange(len_Year, indices1, other.C_Cashflow),
                self.Arrange(len_Year, indices0, self.C_Cum_Cashflow, True)
                + self.Arrange(len_Year, indices1, other.C_Cum_Cashflow, True),
                self.Arrange(len_Year, indices0, self.C_Government_Take)
                + self.Arrange(len_Year, indices1, other.C_Government_Take),
            )
        else:
            raise Exception("Must add an instance of ConcanateCase with another")

    def Arrange(self, len_: int, indices, value: np.ndarray, isCumm: bool = False):
        row: np.ndarray = np.zeros(len_, dtype=float)
        row[indices] = value
        if isCumm:
            for c, col in np.ndenumerate(row):
                if col == 0 and c[0] > 0:
                    row[c[0]] = row[c[0] - 1]
        return row


class CaseCombine:
    caseIndex: int
    tmpFile: Path
    isLast: bool
    ctrType: int
    prevCtrType: np.ndarray
    _conCase: ConcanateCase
    distValue: dict
    inflation_rate: float
    discount_rate: float
    reference_year: int
    npv_mode: NPVSelection
    discounting_mode: DiscountingMode

    def __init__(
        self,
        caseIndex: int,
        tmpFile: Path,
        isLast: bool,
        ctrType: int,
        prevCtrType: np.ndarray,
        dataJson: dict,
        inflation_rate: float = 0.0,
        discount_rate: float = 0.1,
        reference_year: int = 0,
        npv_mode: int = 3,
        discounting_mode: int = 0,
    ):
        self.distValue = {
            f"{v}": {"total": 0, "case": []}
            for v in [
                "C_Lifting_Oil",
                "C_Lifting_Gas",
                # "C_Oil_Revenue",
                # "C_Gas_Revenue",
                "C_Revenue",
                "C_Tax_Payment",
                "C_DDMO",
                "C_Contractor_Take",
                "C_Government_Take",
                "C_Cost_Recovery",
                "C_Deductible_Cost",
            ]
        }
        self.caseIndex = caseIndex
        self.ctrType = ctrType
        self.tmpFile = tmpFile
        self.isLast = isLast
        self.prevCtrType = prevCtrType
        self.inflation_rate = inflation_rate
        self.discount_rate = discount_rate
        self.reference_year = reference_year
        if npv_mode == 0:
            self.npv_mode = NPVSelection.NPV_REAL_TERMS
        elif npv_mode == 1:
            self.npv_mode = NPVSelection.NPV_NOMINAL_TERMS
        elif npv_mode == 2:
            self.npv_mode = NPVSelection.NPV_SKK_NOMINAL_TERMS
        elif npv_mode == 3:
            self.npv_mode = NPVSelection.NPV_SKK_REAL_TERMS
        else:
            self.npv_mode = NPVSelection.NPV_POINT_FORWARD
        self.discounting_mode = (
            DiscountingMode.END_YEAR
            if discounting_mode == 0
            else DiscountingMode.MID_YEAR
        )

        contract = (
            get_costrecovery(data=dataJson, summary_result=False)[1]
            if ctrType == 1
            else (
                get_grosssplit(data=dataJson, summary_result=False)[1]
                if ctrType == 2
                else get_transition(data=dataJson)[1] if ctrType >= 3 else []
            )
        )
        if tmpFile.exists():
            # load last summ/dist
            with open(tmpFile, "rb") as fl:
                saved_ = pickle.load(fl)
            summ = saved_["summ"]
            self.distValue = saved_["dist"]
            self._conCase = ConcanateCase().apply(self.prevCtrType, summ)
            # merge
            if isinstance(contract, CostRecovery):
                self.prevCtrType = np.append(self.prevCtrType, 1)
                self._conCase += self.updateDist(
                    ConcanateCase().make_CostRecovery(contract)
                )
            elif isinstance(contract, GrossSplit):
                self.prevCtrType = np.append(self.prevCtrType, 2)
                self._conCase += self.updateDist(
                    ConcanateCase().make_GrossSplit(contract)
                )
        else:
            if isinstance(contract, CostRecovery):
                self.prevCtrType = np.append(self.prevCtrType, 1)
                self._conCase = self.updateDist(
                    ConcanateCase().make_CostRecovery(contract)
                )
            elif isinstance(contract, GrossSplit):
                self.prevCtrType = np.append(self.prevCtrType, 2)
                self._conCase = self.updateDist(
                    ConcanateCase().make_GrossSplit(contract)
                )

    def updateDist(self, values: ConcanateCase):
        self.distValue["C_Lifting_Oil"]["case"].append(np.sum(values.C_Lifting_Oil))
        self.distValue["C_Lifting_Gas"]["case"].append(np.sum(values.C_Lifting_Gas))
        # self.distValue["C_Oil_Revenue"]["case"].append(np.sum(values.C_Oil_Revenue))
        # self.distValue["C_Gas_Revenue"]["case"].append(np.sum(values.C_Gas_Revenue))
        self.distValue["C_Revenue"]["case"].append(np.sum(values.C_Revenue))
        self.distValue["C_Tax_Payment"]["case"].append(np.sum(values.C_Tax_Payment))
        self.distValue["C_DDMO"]["case"].append(np.sum(values.C_DDMO))
        self.distValue["C_Contractor_Take"]["case"].append(
            np.sum(values.C_Contractor_Take)
        )
        self.distValue["C_Government_Take"]["case"].append(
            np.sum(values.C_Government_Take)
        )
        self.distValue["C_Cost_Recovery"]["case"].append(np.sum(values.C_Cost_Recovery))
        self.distValue["C_Deductible_Cost"]["case"].append(
            np.sum(values.C_Deductible_Cost)
        )
        return values

    def concatenate(self):
        _prevCtrType = np.unique(self.prevCtrType)
        hasCR = np.in1d(1, _prevCtrType)[0]
        hasGS = np.in1d(2, _prevCtrType)[0]
        _summ = {
            "C_Year": self._conCase.C_Year.tolist(),
            "C_Lifting_Oil": self._conCase.C_Lifting_Oil.tolist(),
            "C_Lifting_Gas": self._conCase.C_Lifting_Gas.tolist(),
            "C_Oil_Revenue": self._conCase.C_Oil_Revenue.tolist(),
            "C_Gas_Revenue": self._conCase.C_Gas_Revenue.tolist(),
            "C_Revenue": self._conCase.C_Revenue.tolist(),
            "C_Oil_tangible": self._conCase.C_Oil_tangible.tolist(),
            "C_Gas_tangible": self._conCase.C_Gas_tangible.tolist(),
            "C_Depreciable": self._conCase.C_Depreciable.tolist(),
            "C_Intangible": self._conCase.C_Intangible.tolist(),
            "C_Opex": self._conCase.C_Opex.tolist(),
            "C_ASR": self._conCase.C_ASR.tolist(),
            "C_Depreciation": self._conCase.C_Depreciation.tolist(),
            "C_Non_Capital": self._conCase.C_Non_Capital.tolist(),
            "C_Oil_Sunk_Cost": self._conCase.C_Oil_Sunk_Cost.tolist(),
            "C_Gas_Sunk_Cost": self._conCase.C_Gas_Sunk_Cost.tolist(),
            "C_Sunk_Cost": self._conCase.C_Sunk_Cost.tolist(),
            "C_Total_Expenses": self._conCase.C_Total_Expenses.tolist(),
        }
        if hasCR:
            _summ.update(
                {
                    "C_FTP": self._conCase.C_FTP.tolist(),
                    "C_FTP_CTR": self._conCase.C_FTP_CTR.tolist(),
                    "C_FTP_GOV": self._conCase.C_FTP_GOV.tolist(),
                    "C_IC": self._conCase.C_IC.tolist(),
                    "C_Unrecovered_before_TF": self._conCase.C_Unrecovered_before_TF.tolist(),
                    "C_Cost_Recovery": self._conCase.C_Cost_Recovery.tolist(),
                    "C_ETS_before_TF": self._conCase.C_ETS_before_TF.tolist(),
                    "C_Unrecovered_after_TF": self._conCase.C_Unrecovered_after_TF.tolist(),
                    "C_Cost_to_be_Recovered_after_TF": self._conCase.C_Cost_to_be_Recovered_after_TF.tolist(),
                    "C_Cost_Recovery_after_TF": self._conCase.C_Cost_Recovery_after_TF.tolist(),
                    "C_ETS_after_TF": self._conCase.C_ETS_after_TF.tolist(),
                }
            )
        if hasGS:
            _summ.update(
                {
                    "C_Cost_To_Be_Deducted": self._conCase.C_Cost_To_Be_Deducted.tolist(),
                    "C_Carry_Forward_Cost": self._conCase.C_Carry_Forward_Cost.tolist(),
                    "C_Deductible_Cost": self._conCase.C_Deductible_Cost.tolist(),
                    "C_Carry_Forward_Cost_after_TF": self._conCase.C_Carry_Forward_Cost_after_TF.tolist(),
                    "C_CTR_Share_After": self._conCase.C_CTR_Share_After.tolist(),
                    "C_CTR_Net_Operating_Profit": self._conCase.C_CTR_Net_Operating_Profit.tolist(),
                }
            )
        _summ.update(
            {
                "C_Contractor_Share": self._conCase.C_Contractor_Share.tolist(),
                "C_Government_Share": self._conCase.C_Government_Share.tolist(),
                "C_DMO_Volume": self._conCase.C_DMO_Volume.tolist(),
                "C_DMO_Fee": self._conCase.C_DMO_Fee.tolist(),
                "C_DDMO": self._conCase.C_DDMO.tolist(),
                "C_Taxable_Income": self._conCase.C_Taxable_Income.tolist(),
            }
        )
        if hasCR:
            _summ.update(
                {
                    "C_Tax_Due": self._conCase.C_Tax_Due.tolist(),
                    "C_Unpaid_Tax_Balance": self._conCase.C_Unpaid_Tax_Balance.tolist(),
                }
            )
        _summ.update(
            {
                "C_Tax_Payment": self._conCase.C_Tax_Payment.tolist(),
                "C_CTR_Net_Share": self._conCase.C_CTR_Net_Share.tolist(),
                "C_Contractor_Take": self._conCase.C_Contractor_Take.tolist(),
                "C_Cashflow": self._conCase.C_Cashflow.tolist(),
                "C_Cum_Cashflow": self._conCase.C_Cum_Cashflow.tolist(),
                "C_Government_Take": self._conCase.C_Government_Take.tolist(),
            }
        )
        if self.isLast:
            summKey = _summ.keys()
            for i, k in enumerate(self.distValue.keys()):
                if k in summKey:
                    self.distValue[k]["total"] = np.sum(_summ[k])

            if self.tmpFile.exists():
                os.remove(str(self.tmpFile))

            # Lifting
            lifting_oil = np.sum(self._conCase.C_Lifting_Oil)
            if lifting_oil == 0:
                oil_wap = 0.0
            else:
                oil_wap = np.divide(
                    np.sum(self._conCase.C_Oil_Revenue),
                    lifting_oil,
                    where=lifting_oil != 0,
                )
            lifting_gas = np.sum(self._conCase.C_Lifting_Gas)
            if lifting_gas == 0:
                gas_wap = 0.0
            else:
                gas_wap = np.divide(
                    np.sum(self._conCase.C_Gas_Revenue),
                    lifting_gas,
                    where=lifting_gas != 0,
                )

            # Gross Revenue
            gross_revenue_oil = np.sum(self._conCase.C_Oil_Revenue)
            gross_revenue_gas = np.sum(self._conCase.C_Gas_Revenue)
            gross_revenue = np.sum(gross_revenue_oil + gross_revenue_gas)

            # Sunk Cost
            sunk_cost = np.sum(self._conCase.C_Sunk_Cost)

            # Investment (Capital Cost)
            sunk_cost_extended = np.concatenate(
                (
                    self._conCase.C_Sunk_Cost,
                    np.zeros(
                        len(self._conCase.C_Year) - len(self._conCase.C_Sunk_Cost)
                    ),
                )
            )

            tangible = np.sum(self._conCase.C_Depreciable)

            intangible = np.sum(self._conCase.C_Intangible - sunk_cost_extended)

            investment = tangible + intangible

            # Capex
            oil_capex = np.sum(self._conCase.C_Oil_tangible)
            gas_capex = np.sum(self._conCase.C_Gas_tangible)

            # OPEX and ASR (Non-Capital Cost)
            opex = np.sum(self._conCase.C_Opex)
            asr = np.sum(self._conCase.C_ASR)

            # Cashflow sunk cost
            if sunk_cost == 0:
                cashflow_sunk_cost_pooled = self._conCase.C_Cashflow
            else:
                cashflow_sunk_cost_pooled = np.concatenate(
                    (
                        np.array([-sunk_cost]),
                        self._conCase.C_Cashflow[len(self._conCase.C_Sunk_Cost) :],
                    )
                )

            # Years sunk cost pooled
            years_sunk_cost_pooled = self._conCase.C_Year[
                (len(self._conCase.C_Year) - len(cashflow_sunk_cost_pooled)) :
            ]

            # Government DDMO
            gov_ddmo = np.sum(self._conCase.C_DDMO)

            # Government Take Income
            gov_tax_income = np.sum(self._conCase.C_Tax_Payment)

            # Government Take
            gov_take = np.sum(self._conCase.C_Government_Take)

            # Government Share
            gov_take_over_gross_rev = np.divide(
                gov_take, gross_revenue, where=gross_revenue != 0
            )

            # Contractor IRR
            ctr_irr = irr(cashflow=self._conCase.C_Cashflow)
            ctr_irr_sunk_cost_pooled = irr(cashflow=cashflow_sunk_cost_pooled)

            # Calculation related to NPV Calculation which are depends on the NPV Mode
            # NPV Calculation for SKK Real Terms
            if self.npv_mode == NPVSelection.NPV_SKK_REAL_TERMS:
                # Contractor NPV
                ctr_npv = npv_skk_real_terms(
                    cashflow=self._conCase.C_Cashflow,
                    cashflow_years=self._conCase.C_Year,
                    discount_rate=self.discount_rate,
                    reference_year=self.reference_year,
                    discounting_mode=self.discounting_mode,
                )

                # Contractor NPV when the sunk cost is being pooled on the first year
                ctr_npv_sunk_cost_pooled = npv_skk_real_terms(
                    cashflow=cashflow_sunk_cost_pooled,
                    cashflow_years=years_sunk_cost_pooled,
                    discount_rate=self.discount_rate,
                    reference_year=self.reference_year,
                    discounting_mode=self.discounting_mode,
                )

                # Contractor Investment NPV
                investment_npv = npv_skk_real_terms(
                    cashflow=(
                        self._conCase.C_Depreciable
                        + self._conCase.C_Intangible
                        - sunk_cost_extended
                    ),
                    cashflow_years=self._conCase.C_Year,
                    discount_rate=self.discount_rate,
                    reference_year=self.reference_year,
                    discounting_mode=self.discounting_mode,
                )

                # Government Take Net Present Value
                gov_take_npv = npv_skk_real_terms(
                    cashflow=self._conCase.C_Government_Take,
                    cashflow_years=self._conCase.C_Year,
                    discount_rate=self.discount_rate,
                    reference_year=self.reference_year,
                    discounting_mode=self.discounting_mode,
                )

            # NPV Calculation for SKK Nominal Terms
            elif self.npv_mode == NPVSelection.NPV_SKK_NOMINAL_TERMS:
                # Contractor NPV
                ctr_npv = npv_skk_nominal_terms(
                    cashflow=self._conCase.C_Cashflow,
                    cashflow_years=self._conCase.C_Year,
                    discount_rate=self.discount_rate,
                    discounting_mode=self.discounting_mode,
                )

                # Contractor NPV when the sunk cost is being pooled on the first year
                ctr_npv_sunk_cost_pooled = npv_skk_nominal_terms(
                    cashflow=cashflow_sunk_cost_pooled,
                    cashflow_years=years_sunk_cost_pooled,
                    discount_rate=self.discount_rate,
                    discounting_mode=self.discounting_mode,
                )

                # Contractor Investment NPV
                investment_npv = npv_skk_nominal_terms(
                    cashflow=(
                        self._conCase.C_Depreciable
                        + self._conCase.C_Intangible
                        - sunk_cost_extended
                    ),
                    cashflow_years=self._conCase.C_Year,
                    discount_rate=self.discount_rate,
                    discounting_mode=self.discounting_mode,
                )

                # Government Take Net Present Value
                gov_take_npv = npv_skk_nominal_terms(
                    cashflow=self._conCase.C_Government_Take,
                    cashflow_years=self._conCase.C_Year,
                    discount_rate=self.discount_rate,
                    discounting_mode=self.discounting_mode,
                )

            # NPV Calculation for Nominal Terms
            elif self.npv_mode == NPVSelection.NPV_NOMINAL_TERMS:
                # Contractor NPV
                ctr_npv = npv_nominal_terms(
                    cashflow=self._conCase.C_Cashflow,
                    cashflow_years=self._conCase.C_Year,
                    discount_rate=self.discount_rate,
                    reference_year=self.reference_year,
                    discounting_mode=self.discounting_mode,
                )

                # Contractor NPV when the sunk cost is being pooled on the first year
                ctr_npv_sunk_cost_pooled = npv_nominal_terms(
                    cashflow=cashflow_sunk_cost_pooled,
                    cashflow_years=years_sunk_cost_pooled,
                    discount_rate=self.discount_rate,
                    reference_year=self.reference_year,
                    discounting_mode=self.discounting_mode,
                )

                # Contractor Investment NPV
                investment_npv = npv_nominal_terms(
                    cashflow=(
                        self._conCase.C_Depreciable
                        + self._conCase.C_Intangible
                        - sunk_cost_extended
                    ),
                    cashflow_years=self._conCase.C_Year,
                    discount_rate=self.discount_rate,
                    reference_year=self.reference_year,
                    discounting_mode=self.discounting_mode,
                )

                # Government Take Net Present Value
                gov_take_npv = npv_nominal_terms(
                    cashflow=self._conCase.C_Government_Take,
                    cashflow_years=self._conCase.C_Year,
                    discount_rate=self.discount_rate,
                    reference_year=self.reference_year,
                    discounting_mode=self.discounting_mode,
                )

            # NPV Calculation for Real Terms
            elif self.npv_mode == NPVSelection.NPV_REAL_TERMS:
                # Contractor NPV
                ctr_npv = npv_real_terms(
                    cashflow=self._conCase.C_Cashflow,
                    cashflow_years=self._conCase.C_Year,
                    discount_rate=self.discount_rate,
                    reference_year=self.reference_year,
                    inflation_rate=self.inflation_rate,
                    discounting_mode=self.discounting_mode,
                )

                # Contractor NPV when the sunk cost is being pooled on the first year
                ctr_npv_sunk_cost_pooled = npv_real_terms(
                    cashflow=cashflow_sunk_cost_pooled,
                    cashflow_years=years_sunk_cost_pooled,
                    discount_rate=self.discount_rate,
                    reference_year=self.reference_year,
                    inflation_rate=self.inflation_rate,
                    discounting_mode=self.discounting_mode,
                )

                # Contractor Investment NPV
                investment_npv = npv_real_terms(
                    cashflow=(
                        self._conCase.C_Depreciable
                        + self._conCase.C_Intangible
                        - sunk_cost_extended
                    ),
                    cashflow_years=self._conCase.C_Year,
                    discount_rate=self.discount_rate,
                    reference_year=self.reference_year,
                    inflation_rate=self.inflation_rate,
                    discounting_mode=self.discounting_mode,
                )

                # Government Take Net Present Value
                gov_take_npv = npv_real_terms(
                    cashflow=self._conCase.C_Government_Take,
                    cashflow_years=self._conCase.C_Year,
                    discount_rate=self.discount_rate,
                    reference_year=self.reference_year,
                    inflation_rate=self.inflation_rate,
                    discounting_mode=self.discounting_mode,
                )

            # NPV Calculation for Point Forwards
            else:
                # Contractor NPV
                ctr_npv = npv_point_forward(
                    cashflow=self._conCase.C_Cashflow,
                    cashflow_years=self._conCase.C_Year,
                    discount_rate=self.discount_rate,
                    reference_year=self.reference_year,
                    discounting_mode=self.discounting_mode,
                )

                # Contractor NPV when the sunk cost is being pooled on the first year
                ctr_npv_sunk_cost_pooled = npv_point_forward(
                    cashflow=cashflow_sunk_cost_pooled,
                    cashflow_years=years_sunk_cost_pooled,
                    discount_rate=self.discount_rate,
                    reference_year=self.reference_year,
                    discounting_mode=self.discounting_mode,
                )

                # Contractor Investment NPV
                investment_npv = npv_point_forward(
                    cashflow=(
                        self._conCase.C_Depreciable
                        + self._conCase.C_Intangible
                        - sunk_cost_extended
                    ),
                    cashflow_years=self._conCase.C_Year,
                    discount_rate=self.discount_rate,
                    reference_year=self.reference_year,
                    discounting_mode=self.discounting_mode,
                )

                # Government Take Net Present Value
                gov_take_npv = npv_point_forward(
                    cashflow=self._conCase.C_Government_Take,
                    cashflow_years=self._conCase.C_Year,
                    discount_rate=self.discount_rate,
                    reference_year=self.reference_year,
                    discounting_mode=self.discounting_mode,
                )

                #  Modifying the Contractor Net Cashflow since the cashflow before the reference year is neglected.
                ref_year_arr = np.full_like(
                    self._conCase.C_Cashflow, fill_value=self.reference_year
                )
                cashflow_point_forward = np.where(
                    self._conCase.C_Year >= ref_year_arr,
                    self._conCase.C_Cashflow,
                    0,
                )
                gross_revenue_point_forward = np.where(
                    self._conCase.C_Year >= ref_year_arr,
                    self._conCase.C_Revenue,
                    0,
                )
                ctr_net_cashflow = np.sum(cashflow_point_forward, dtype=float)
                gross_revenue_point_forward = np.sum(
                    gross_revenue_point_forward, dtype=float
                )
                ctr_net_cashflow_over_gross_rev = np.divide(
                    ctr_net_cashflow,
                    gross_revenue_point_forward,
                    where=gross_revenue_point_forward != 0,
                )

            # Contractor Present Value ratio to the investment npv
            ctr_pv_ratio = np.divide(ctr_npv, investment_npv, where=investment_npv != 0)
            ctr_pi = 1 + ctr_pv_ratio

            # Contractor POT
            ctr_pot = pot_psc(
                cashflow=self._conCase.C_Cashflow,
                cashflow_years=self._conCase.C_Year,
                reference_year=self.reference_year,
            )

            # CTR Gross Share
            ctr_gross_share = np.sum(self._conCase.C_Contractor_Share)

            # GOV GOV Gross Share
            gov_gross_share = np.sum(self._conCase.C_Government_Share)

            # Cost Recovery
            cost_recovery = np.sum(self._conCase.C_Cost_Recovery_after_TF)
            cost_recovery_over_gross_rev = np.divide(
                cost_recovery, gross_revenue, where=gross_revenue != 0
            )

            # Unrecoverable Cost
            unrec_cost = self._conCase.C_Unrecovered_after_TF[-1]
            unrec_over_costrec = np.divide(
                unrec_cost, cost_recovery, where=cost_recovery != 0
            )
            unrec_over_gross_rev = np.divide(
                unrec_cost, gross_revenue, where=gross_revenue != 0
            )

            #  Deductible Cost
            deductible_cost = np.sum(self._conCase.C_Deductible_Cost)
            deductible_cost_over_gross_rev = np.divide(
                deductible_cost, gross_revenue, where=gross_revenue != 0
            )

            # Carry Forward Cost
            carry_forward_deductible_cost = self._conCase.C_Carry_Forward_Cost[-1]
            carry_forcost_over_gross_share = np.divide(
                carry_forward_deductible_cost, gross_revenue, where=gross_revenue != 0
            )
            carry_forcost_over_deductible_cost = np.divide(
                carry_forward_deductible_cost,
                deductible_cost,
                where=deductible_cost != 0,
            )

            # Contractor Net Share
            ctr_net_share = np.sum(self._conCase.C_CTR_Net_Share, dtype=float)
            ctr_net_share_over_gross_share = np.divide(
                ctr_net_share, gross_revenue, where=gross_revenue != 0
            )

            # Contractor Net Cashflow
            ctr_net_cashflow = np.sum(self._conCase.C_Cashflow, dtype=float)
            ctr_net_cashflow_over_gross_rev = np.divide(
                ctr_net_cashflow, gross_revenue, where=gross_revenue != 0
            )

            # Government FTP Share
            gov_ftp_share = np.sum(self._conCase.C_FTP_GOV)

            # Government Equity Share
            gov_equity_share = np.sum(self._conCase.C_Government_Share)

            exc_cummary_ = {
                "Oil Production": {"value": lifting_oil, "unit": "MMSTB"},
                "Oil WAP": {"value": oil_wap, "unit": "US$/bbl"},
                "Gas Production": {"value": lifting_gas, "unit": "TBTU"},
                "Gas WAP": {"value": gas_wap, "unit": "US$/MMBTU"},
                "Gross Revenue": {
                    "value": gross_revenue,
                    "unit": "MUS$",
                    "child": [
                        {"Oil Revenue": {"value": gross_revenue_oil, "unit": "MUS$"}},
                        {"Gas Revenue": {"value": gross_revenue_gas, "unit": "MUS$"}},
                    ],
                },
                "gross_share": {
                    "value": None,
                    "unit": None,
                    "child": [
                        {
                            "Contr. Gross Share": {
                                "value": ctr_gross_share,
                                "unit": "MUS$",
                            }
                        },
                        {"GoI Gross Share": {"value": gov_gross_share, "unit": "MUS$"}},
                    ],
                },
                "Sunk Cost": {"value": sunk_cost, "unit": "MUS$"},
                "Investment": {
                    "value": investment,
                    "unit": "MUS$",
                    "child": [
                        {"Tangible": {"value": tangible, "unit": "MUS$"}},
                        {"Intangible": {"value": intangible, "unit": "MUS$"}},
                    ],
                },
                "oil_capex": {"value": oil_capex, "unit": "MUS$"},
                "gas_capex": {"value": gas_capex, "unit": "MUS$"},
                "OPEX + ASR": {
                    "value": opex + asr,
                    "unit": "MUS$",
                    "child": [
                        {"OPEX": {"value": opex, "unit": "MUS$"}},
                        {"ASR": {"value": asr, "unit": "MUS$"}},
                    ],
                },
            }
            if hasCR and hasGS:
                exc_cummary_.update(
                    {
                        "Cost Recovery / Deductible Cost": {
                            "value": cost_recovery + deductible_cost,
                            "unit": "MUS$",
                            "child": [
                                {
                                    "Cost Recovery": {
                                        "value": [
                                            cost_recovery,
                                            cost_recovery_over_gross_rev,
                                        ],
                                        "unit": ["MUS$", "%"],
                                    }
                                },
                                {
                                    "Deductible Cost": {
                                        "value": [
                                            deductible_cost,
                                            deductible_cost_over_gross_rev,
                                        ],
                                        "unit": ["MUS$", "%"],
                                    }
                                },
                            ],
                        },
                    }
                )
            elif hasCR and not hasGS:
                exc_cummary_.update(
                    {
                        "Cost Recovery": {
                            "value": cost_recovery,
                            "unit": "MUS$",
                            "child": [
                                {
                                    "(% Gross Revenue)": {
                                        "value": cost_recovery_over_gross_rev,
                                        "unit": "%",
                                    }
                                }
                            ],
                        },
                    }
                )
            elif hasGS and not hasCR:
                exc_cummary_.update(
                    {
                        "Deductible Cost": {
                            "value": deductible_cost,
                            "unit": "MUS$",
                            "child": [
                                {
                                    "(% Gross Revenue)": {
                                        "value": deductible_cost_over_gross_rev,
                                        "unit": "%",
                                    }
                                },
                            ],
                        },
                    }
                )
            # unrec
            if hasCR and hasGS:
                exc_cummary_.update(
                    {
                        "Unrec. Cost / Carry Fwd. Deductible Cost": {
                            "value": unrec_cost + carry_forward_deductible_cost,
                            "unit": "MUS$",
                            "child": [
                                {
                                    "Unrec. Cost": {
                                        "value": [unrec_cost, unrec_over_gross_rev],
                                        "unit": ["MUS$", "%"],
                                    }
                                },
                                {
                                    "Carry Fwd. Deductible Cost": {
                                        "value": [
                                            carry_forward_deductible_cost,
                                            carry_forcost_over_gross_share,
                                        ],
                                        "unit": ["MUS$", "%"],
                                    }
                                },
                            ],
                        },
                    }
                )
            elif hasCR and not hasGS:
                exc_cummary_.update(
                    {
                        "Unrec. Cost": {
                            "value": unrec_cost,
                            "unit": "MUS$",
                            "child": [
                                {
                                    "(% Gross Revenue)": {
                                        "value": unrec_over_gross_rev,
                                        "unit": "%",
                                    }
                                },
                            ],
                        },
                    }
                )
            elif hasGS and not hasCR:
                exc_cummary_.update(
                    {
                        "Carry Fwd. Deductible Cost": {
                            "value": carry_forward_deductible_cost,
                            "unit": "MUS$",
                            "child": [
                                {
                                    "(% Gross Revenue)": {
                                        "value": carry_forcost_over_gross_share,
                                        "unit": "%",
                                    }
                                },
                            ],
                        },
                    }
                )

            exc_cummary_.update(
                {
                    "Contractor Profitability": {
                        "value": None,
                        "unit": None,
                        "child": [
                            {
                                "Contr. Net Share": {
                                    "value": ctr_net_share,
                                    "unit": "MUS$",
                                }
                            },
                            {
                                "(% Gross Rev)": {
                                    "value": ctr_net_share_over_gross_share,
                                    "unit": "%",
                                }
                            },
                            {
                                "Contr. Net Cash Flow": {
                                    "value": ctr_net_cashflow,
                                    "unit": "MUS$",
                                }
                            },
                            {
                                "(% Gross Rev)": {
                                    "value": ctr_net_cashflow_over_gross_rev,
                                    "unit": "%",
                                }
                            },
                            {"Contr. NPV": {"value": ctr_npv, "unit": "MUS$"}},
                            {"Contr. IRR": {"value": ctr_irr, "unit": "%"}},
                            {"Contr. POT": {"value": ctr_pot, "unit": "Year"}},
                            {"Contr. PV Ratio": {"value": ctr_pv_ratio, "unit": None}},
                            {"Contr. PI": {"value": ctr_pi, "unit": None}},
                        ],
                    },
                    "GoI Profitability": {
                        "value": None,
                        "child": [
                            {
                                "GoI Gross Share": {
                                    "value": gov_gross_share,
                                    "unit": "MUS$",
                                }
                            },
                            {
                                "FTP (PSC Cost Recovery)": {
                                    "value": gov_ftp_share,
                                    "unit": "MUS$",
                                }
                            },
                            {"Net DMO": {"value": gov_ddmo, "unit": "MUS$"}},
                            {"Tax": {"value": gov_tax_income, "unit": "MUS$"}},
                            {"GoI Take": {"value": gov_take, "unit": "MUS$"}},
                            {
                                "(% Gross Rev)": {
                                    "value": gov_take_over_gross_rev,
                                    "unit": "%",
                                }
                            },
                            {"GoI NPV": {"value": gov_take_npv, "unit": "MUS$"}},
                        ],
                    },
                }
            )

            # calc datacard
            _dataCard = {
                "revenue": [
                    gross_revenue,
                    gross_revenue_oil,
                    gross_revenue_gas,
                ],
                "lifting": [
                    lifting_oil,
                    lifting_gas,
                ],
                "ctr": {
                    "NCS": ctr_net_share,
                    "IRR": ctr_irr,
                    "POT": ctr_pot,
                    "PI": ctr_pi,
                    "NPV": ctr_npv,
                    "CF": np.sum(self._conCase.C_Cashflow),
                },
                "gov": {
                    "GovTake": gov_take,
                    "GovTakeNPV": gov_take_npv,
                    "GovDMO": gov_ddmo,
                    "FTP": gov_ftp_share,
                    "GovTaxIncome": gov_tax_income,
                },
            }

            return {
                "CtrType": _prevCtrType.tolist(),
                "summary": exc_cummary_,
                "table": _summ,
                "dataCard": _dataCard,
                "dist": self.distValue,
                "filename": base64.b64encode(str(self.tmpFile).encode("utf-8")).decode(
                    "utf-8"
                ),
            }
        else:
            with open(self.tmpFile, "wb") as out0:
                pickle.dump({"summ": _summ, "dist": self.distValue}, out0)
            return {
                "CtrType": _prevCtrType.tolist(),
                "summary": None,
                "table": None,
                "dataCard": None,
                "dist": None,
                "filename": base64.b64encode(str(self.tmpFile).encode("utf-8")).decode(
                    "utf-8"
                ),
            }
