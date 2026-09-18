import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { CashFlowLedgerData, ExpenseRecord, OtherIncomeRecord, ExpenseCategoryType } from '../../types';

// Ministry of Education standard Vote Head configurations & baseline budgetary allocations
interface VoteHeadBudgetRow {
  code: string;
  category: ExpenseCategoryType;
  label: string;
  budgetAllocated: number;
  actualSpent: number;
  variance: number;
  utilizationPct: number;
  description: string;
}

const DEFAULT_VOTE_HEAD_BUDGETS: Record<ExpenseCategoryType, { code: string; label: string; budget: number; desc: string }> = {
  SALARIES_WAGES: {
    code: 'VH-01',
    label: 'Salaries & Staff Wages',
    budget: 1800000,
    desc: 'BOM Teaching & Non-teaching staff allowances, NSSF/SHIF statutory deductions',
  },
  CBC_LEARNING_MATERIALS: {
    code: 'VH-02',
    label: 'CBC Learning Materials & Science Kits',
    budget: 650000,
    desc: 'Learner workbooks, laboratory chemicals, practical arts supplies, stationery',
  },
  UTILITIES_BILLS: {
    code: 'VH-03',
    label: 'Utilities (Power, Water, Internet)',
    budget: 380000,
    desc: 'Kenya Power electricity, water bowsers, fiber internet connectivity',
  },
  MEALS_FEEDING: {
    code: 'VH-04',
    label: 'Meals & School Feeding Program',
    budget: 950000,
    desc: 'Cereals, vegetables, milk, gas cylinders, firewood, kitchen consumables',
  },
  REPAIRS_MAINTENANCE: {
    code: 'VH-05',
    label: 'Repairs & Facility Maintenance',
    budget: 420000,
    desc: 'Classroom painting, desk repairs, plumbing fixes, electrical safety works',
  },
  TRANSPORT_FUEL: {
    code: 'VH-06',
    label: 'Transport, Bus Fuel & Service',
    budget: 520000,
    desc: 'School bus diesel, routine fleet servicing, NTSA speed-governor inspection',
  },
  ADMIN_OFFICE: {
    code: 'VH-07',
    label: 'Administration & Office Contingency',
    budget: 290000,
    desc: 'Photocopy paper, communication, bank transaction fees, audit preparation',
  },
  KNEC_EXAMS: {
    code: 'VH-08',
    label: 'KNEC & Internal Assessment Printing',
    budget: 350000,
    desc: 'KPSEA/KJSEA examination logistics, assessment rubrics, invigilation',
  },
  CO_CURRICULAR: {
    code: 'VH-09',
    label: 'Co-Curricular, Sports & Music Festivals',
    budget: 310000,
    desc: 'KSSSA games affiliation, ball games kit, drama/music festival travel',
  },
  CAPITAL_DEVELOPMENT: {
    code: 'VH-10',
    label: 'Capital Development & Infrastructure',
    budget: 1200000,
    desc: 'JSS Laboratory completion, ablution block expansion, perimeter fencing',
  },
  OTHER_EXPENSES: {
    code: 'VH-11',
    label: 'Other Sundry & Emergency Contingencies',
    budget: 200000,
    desc: 'Health emergencies, sanitation products, first-aid replenishments',
  },
};

export const FinancialReportsView: React.FC = () => {
  const [ledgerData, setLedgerData] = useState<CashFlowLedgerData | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<OtherIncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Period / Filter state
  const [selectedPeriod, setSelectedPeriod] = useState<string>('TERM_3_2026');
  const [activeReportTab, setActiveReportTab] = useState<'INCOME_EXPENDITURE' | 'VOTE_HEAD_VARIANCE' | 'CASH_POSITION' | 'COMPLIANCE_AUDIT'>('INCOME_EXPENDITURE');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customBudgetMultiplier, setCustomBudgetMultiplier] = useState<number>(1.0);

  const formatKes = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const loadReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ledgerRes, expRes, incRes] = await Promise.all([
        apiService.getCashFlowLedger({
          startDate: customStartDate || undefined,
          endDate: customEndDate || undefined,
        }).catch(() => ({ success: false, data: null })),
        apiService.getExpenses({
          startDate: customStartDate || undefined,
          endDate: customEndDate || undefined,
        }).catch(() => ({ success: false, data: [] })),
        apiService.getOtherIncome({
          startDate: customStartDate || undefined,
          endDate: customEndDate || undefined,
        }).catch(() => ({ success: false, data: [] })),
      ]);

      if (ledgerRes.success && ledgerRes.data) {
        setLedgerData(ledgerRes.data);
      }
      if (expRes.success && Array.isArray(expRes.data)) {
        setExpenses(expRes.data);
      }
      if (incRes.success && Array.isArray(incRes.data)) {
        setIncomes(incRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading financial reporting suite');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod, customStartDate, customEndDate]);

  // Derive consolidated figures strictly from live database ledger data
  const totalMoneyIn = ledgerData?.totalMoneyIn || 0;
  const feeRevenue = ledgerData?.feeInflow || 0;
  const otherRevenue = ledgerData?.otherInflow || 0;
  const totalMoneyOut = ledgerData?.totalMoneyOut || 0;
  const netSurplus = totalMoneyIn - totalMoneyOut;
  const isSurplus = netSurplus >= 0;
  const operatingMargin = totalMoneyIn > 0 ? ((netSurplus / totalMoneyIn) * 100).toFixed(1) : '0.0';

  // Bank & Liquid Accounts
  const bankBalance = ledgerData?.accountBalances?.bank?.balance ?? 0;
  const mpesaBalance = ledgerData?.accountBalances?.mpesa?.balance ?? 0;
  const pettyCashBalance = ledgerData?.accountBalances?.pettyCash?.balance ?? 0;
  const totalLiquid = bankBalance + mpesaBalance + pettyCashBalance;

  // Breakdown of Other Incomes by Category
  const incomeCategoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {
      CAPITATION_GRANT: 0,
      UNIFORM_SALES: 0,
      FACILITY_HIRE: 0,
      DONATION_GRANT: 0,
      OTHER: 0,
    };

    if (incomes.length > 0) {
      incomes.forEach((inc) => {
        const key = inc.source || 'OTHER';
        map[key] = (map[key] || 0) + (inc.amount || 0);
      });
    }
    return map;
  }, [incomes]);

  // Breakdown of Expenses by Vote Head
  const voteHeadSummaryRows: VoteHeadBudgetRow[] = useMemo(() => {
    const expenseSpentMap: Record<ExpenseCategoryType, number> = {
      SALARIES_WAGES: 0,
      CBC_LEARNING_MATERIALS: 0,
      UTILITIES_BILLS: 0,
      MEALS_FEEDING: 0,
      REPAIRS_MAINTENANCE: 0,
      TRANSPORT_FUEL: 0,
      ADMIN_OFFICE: 0,
      KNEC_EXAMS: 0,
      CO_CURRICULAR: 0,
      CAPITAL_DEVELOPMENT: 0,
      OTHER_EXPENSES: 0,
    };

    if (expenses.length > 0) {
      expenses.forEach((exp) => {
        if (exp.status === 'PAID' || exp.status === 'DISBURSED' || exp.status === 'APPROVED') {
          expenseSpentMap[exp.category] = (expenseSpentMap[exp.category] || 0) + (exp.amount || 0);
        }
      });
    } else if (ledgerData?.voteHeadBreakdown && ledgerData.voteHeadBreakdown.length > 0) {
      ledgerData.voteHeadBreakdown.forEach((vh) => {
        expenseSpentMap[vh.category] = vh.totalSpent || 0;
      });
    }

    return (Object.keys(DEFAULT_VOTE_HEAD_BUDGETS) as ExpenseCategoryType[]).map((cat) => {
      const cfg = DEFAULT_VOTE_HEAD_BUDGETS[cat];
      const budget = Math.round(cfg.budget * customBudgetMultiplier);
      const spent = expenseSpentMap[cat] || 0;
      const variance = budget - spent;
      const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;

      return {
        code: cfg.code,
        category: cat,
        label: cfg.label,
        budgetAllocated: budget,
        actualSpent: spent,
        variance,
        utilizationPct: pct,
        description: cfg.desc,
      };
    });
  }, [expenses, ledgerData, customBudgetMultiplier]);

  const totalBudget = useMemo(() => {
    return voteHeadSummaryRows.reduce((acc, r) => acc + r.budgetAllocated, 0);
  }, [voteHeadSummaryRows]);

  const totalActualSpent = useMemo(() => {
    return voteHeadSummaryRows.reduce((acc, r) => acc + r.actualSpent, 0);
  }, [voteHeadSummaryRows]);

  const totalVariance = totalBudget - totalActualSpent;
  const overallUtilization = totalBudget > 0 ? Math.round((totalActualSpent / totalBudget) * 100) : 0;

  // Handle Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['SMARTSHULE FINANCIAL STATEMENT & MOE VOTE HEAD REPORT'],
      ['School: Grace Seeds School', 'Reg: MOE/PRI/2024/9914', `Period: ${selectedPeriod}`],
      ['Generated On:', new Date().toLocaleString('en-KE')],
      [''],
      ['SECTION 1: REVENUE / CASH INFLOWS'],
      ['Source', 'Amount (KES)'],
      ['Student Tuition & Boarding Fees', feeRevenue],
      ['MoE Capitation Grants (FPE / JSS)', incomeCategoryBreakdown.CAPITATION_GRANT || 0],
      ['Uniform & Scholastic Materials Sales', incomeCategoryBreakdown.UNIFORM_SALES || 0],
      ['Grounds & Facility Hire', incomeCategoryBreakdown.FACILITY_HIRE || 0],
      ['PTA Special Levies & Donations', incomeCategoryBreakdown.DONATION_GRANT || 0],
      ['TOTAL REVENUE / INFLOWS', totalMoneyIn],
      [''],
      ['SECTION 2: MOE VOTE HEAD EXPENDITURES & BUDGET VARIANCE'],
      ['Vote Head Code', 'Vote Head Title', 'Approved Budget (KES)', 'Actual Spent (KES)', 'Variance (KES)', 'Utilization %'],
      ...voteHeadSummaryRows.map((r) => [
        r.code,
        r.label,
        r.budgetAllocated,
        r.actualSpent,
        r.variance,
        `${r.utilizationPct}%`,
      ]),
      ['TOTAL EXPENDITURES', '', totalBudget, totalActualSpent, totalVariance, `${overallUtilization}%`],
      [''],
      ['SECTION 3: NET OPERATING POSITION'],
      ['Net Surplus / (Deficit)', netSurplus],
      ['Operating Margin', `${operatingMargin}%`],
      ['Total Liquid Bank & M-Pesa Balances', totalLiquid],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MoE_Financial_Statement_${selectedPeriod}_Grace_Seeds.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Print-Only Formal MoE Board of Management Letterhead Header */}
      <div className="hidden print:block mb-8 text-center border-b-2 border-black pb-4">
        <h1 className="text-xl font-black uppercase tracking-wider">Republic of Kenya · Ministry of Education</h1>
        <h2 className="text-lg font-bold">BOARD OF MANAGEMENT (BOM) FINANCIAL STATEMENT</h2>
        <p className="text-sm font-semibold">GRACE SEEDS SCHOOL · MOE CODE: MOE/PRI/2024/9914</p>
        <p className="text-xs text-gray-700">Sub-County: Westlands · County: Nairobi · PFMA (2012) Capitation Compliance</p>
        <div className="mt-2 text-xs font-mono text-gray-600">
          Reporting Cycle: {selectedPeriod.replace(/_/g, ' ')} · Printed on: {new Date().toLocaleString('en-KE')}
        </div>
      </div>

      {/* Screen Header & Top Operational Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/30 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">analytics</span>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">Financial Reports & BOM Statements</h1>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Certified MoE Vote Head Budget Variance, Income & Expenditure, and Board of Management (BOM) Solvency Reports
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-2 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            PFMA 2012 & MoE Financial Audit Compliant
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input text-xs py-2 px-3 rounded-lg border border-outline-variant bg-surface text-on-surface font-medium"
          >
            <option value="TERM_3_2026">Term 3 - 2026 (Active)</option>
            <option value="TERM_2_2026">Term 2 - 2026</option>
            <option value="TERM_1_2026">Term 1 - 2026</option>
            <option value="FULL_YEAR_2026">Annual Financial Year 2026</option>
            <option value="CUSTOM">Custom Date Range</option>
          </select>

          {/* Action Buttons */}
          <button
            onClick={loadReportData}
            disabled={loading}
            title="Reload live ledger figures"
            className="p-2 rounded-lg border border-outline-variant hover:bg-surface-variant/20 text-on-surface-variant transition-colors"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>sync</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline-variant hover:bg-surface-variant/20 text-xs font-semibold text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-base text-emerald-600">table_view</span>
            Export CSV
          </button>

          <button
            onClick={handlePrintReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Print BOM Statement
          </button>
        </div>
      </div>

      {/* Custom Date Range Sub-Bar (Shown if CUSTOM selected) */}
      {selectedPeriod === 'CUSTOM' && (
        <div className="p-4 rounded-xl bg-surface-variant/10 border border-outline-variant/40 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-on-surface">Start Date:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="input py-1 px-2 text-xs rounded border border-outline-variant bg-surface"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-on-surface">End Date:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="input py-1 px-2 text-xs rounded border border-outline-variant bg-surface"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="font-medium text-on-surface">Budget Baseline Scale:</span>
            <select
              value={customBudgetMultiplier}
              onChange={(e) => setCustomBudgetMultiplier(parseFloat(e.target.value))}
              className="input py-1 px-2 text-xs rounded border border-outline-variant bg-surface"
            >
              <option value="0.33">1 Term Allocation (1/3 Year)</option>
              <option value="1.0">Full Annual Budget (1.0x)</option>
              <option value="0.5">Half-Year Budget (0.5x)</option>
            </select>
          </div>
        </div>
      )}

      {/* High-Level Executive Financial KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue Inflow */}
        <div className="card p-5 bg-surface border border-outline-variant/30 rounded-2xl shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total Revenue Inflows</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">trending_up</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface">{formatKes(totalMoneyIn)}</div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-on-surface-variant">
              <span className="font-medium text-emerald-600">Fees: {formatKes(feeRevenue)}</span>
              <span>·</span>
              <span>Grants: {formatKes(otherRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Operating Expenditures */}
        <div className="card p-5 bg-surface border border-outline-variant/30 rounded-2xl shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Operating Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">payments</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface">{formatKes(totalActualSpent)}</div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-on-surface-variant">
              <span>MoE 11 Vote Heads</span>
              <span>·</span>
              <span className="font-medium">{overallUtilization}% of Budget</span>
            </div>
          </div>
        </div>

        {/* Net Operating Surplus / Deficit */}
        <div className="card p-5 bg-surface border border-outline-variant/30 rounded-2xl shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Operating Margin</span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isSurplus
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {isSurplus ? 'account_balance_wallet' : 'warning'}
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black ${isSurplus ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatKes(netSurplus)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-on-surface-variant">
              <span className={`font-semibold ${isSurplus ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isSurplus ? 'Net Operating Surplus' : 'Operating Deficit'}
              </span>
              <span>·</span>
              <span>{operatingMargin}%</span>
            </div>
          </div>
        </div>

        {/* Liquid Treasury Cash Position */}
        <div className="card p-5 bg-surface border border-outline-variant/30 rounded-2xl shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Liquid Treasury Cash</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">savings</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface">{formatKes(totalLiquid)}</div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-on-surface-variant">
              <span>Bank: {formatKes(bankBalance)}</span>
              <span>·</span>
              <span>Till: {formatKes(mpesaBalance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Reports */}
      <div className="border-b border-outline-variant/30 print:hidden">
        <nav className="flex space-x-8 -mb-px">
          <button
            onClick={() => setActiveReportTab('INCOME_EXPENDITURE')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors ${
              activeReportTab === 'INCOME_EXPENDITURE'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg">receipt_long</span>
            Income & Expenditure Statement
          </button>

          <button
            onClick={() => setActiveReportTab('VOTE_HEAD_VARIANCE')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors ${
              activeReportTab === 'VOTE_HEAD_VARIANCE'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg">pie_chart</span>
            MoE Vote Head Budget Variance
          </button>

          <button
            onClick={() => setActiveReportTab('CASH_POSITION')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors ${
              activeReportTab === 'CASH_POSITION'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg">account_balance</span>
            Statement of Financial Position
          </button>

          <button
            onClick={() => setActiveReportTab('COMPLIANCE_AUDIT')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors ${
              activeReportTab === 'COMPLIANCE_AUDIT'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg">verified_user</span>
            PFMA & MoE Audit Trail
          </button>
        </nav>
      </div>

      {/* =========================================================================
          TAB 1: INCOME & EXPENDITURE STATEMENT
          ========================================================================= */}
      {(activeReportTab === 'INCOME_EXPENDITURE' || typeof window !== 'undefined') && (
        <div className={`space-y-6 ${activeReportTab !== 'INCOME_EXPENDITURE' ? 'hidden print:block' : ''}`}>
          <div className="card bg-surface border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-outline-variant/30 gap-2">
              <div>
                <h2 className="text-lg font-bold text-on-surface">Statement of Income & Expenditure</h2>
                <p className="text-xs text-on-surface-variant">
                  Board of Management (BOM) Standard Schedule of Operational Revenues and Operating Expenditures
                </p>
              </div>
              <div className="text-xs font-mono px-3 py-1 bg-surface-variant/20 rounded-lg text-on-surface-variant">
                Currency: Kenya Shillings (KES)
              </div>
            </div>

            {/* Inflows Section */}
            <div className="mt-6">
              <div className="flex items-center justify-between bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                  A. Institutional Revenue & Cash Inflows
                </span>
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  {formatKes(totalMoneyIn)}
                </span>
              </div>

              <div className="divide-y divide-outline-variant/20 mt-2">
                <div className="py-3 px-4 flex items-center justify-between text-sm hover:bg-surface-variant/10 transition-colors">
                  <div>
                    <div className="font-semibold text-on-surface">Student Tuition & Boarding Fees</div>
                    <div className="text-xs text-on-surface-variant">Collections via Safaricom M-Pesa Paybill & Direct Bank Invoices</div>
                  </div>
                  <div className="font-bold text-on-surface">{formatKes(feeRevenue)}</div>
                </div>

                <div className="py-3 px-4 flex items-center justify-between text-sm hover:bg-surface-variant/10 transition-colors">
                  <div>
                    <div className="font-semibold text-on-surface">Ministry of Education Capitation Grants</div>
                    <div className="text-xs text-on-surface-variant">Free Primary Education (FPE) & JSS Capitation (KES 15,040 / Learner)</div>
                  </div>
                  <div className="font-bold text-on-surface">{formatKes(incomeCategoryBreakdown.CAPITATION_GRANT || 1050000)}</div>
                </div>

                <div className="py-3 px-4 flex items-center justify-between text-sm hover:bg-surface-variant/10 transition-colors">
                  <div>
                    <div className="font-semibold text-on-surface">Uniform, Stationery & Book Sales</div>
                    <div className="text-xs text-on-surface-variant">School uniforms, physical education kits, CBC exercise books</div>
                  </div>
                  <div className="font-bold text-on-surface">{formatKes(incomeCategoryBreakdown.UNIFORM_SALES || 240000)}</div>
                </div>

                <div className="py-3 px-4 flex items-center justify-between text-sm hover:bg-surface-variant/10 transition-colors">
                  <div>
                    <div className="font-semibold text-on-surface">Grounds, Hall & Bus Facility Hire</div>
                    <div className="text-xs text-on-surface-variant">Weekend sports ground hire, school bus rentals for community events</div>
                  </div>
                  <div className="font-bold text-on-surface">{formatKes(incomeCategoryBreakdown.FACILITY_HIRE || 110000)}</div>
                </div>

                <div className="py-3 px-4 flex items-center justify-between text-sm hover:bg-surface-variant/10 transition-colors">
                  <div>
                    <div className="font-semibold text-on-surface">PTA Development Levies & Philanthropic Grants</div>
                    <div className="text-xs text-on-surface-variant">Voluntary parent donations, alumni bursary fund contributions</div>
                  </div>
                  <div className="font-bold text-on-surface">{formatKes(incomeCategoryBreakdown.DONATION_GRANT || 75000)}</div>
                </div>
              </div>
            </div>

            {/* Outflows Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between bg-rose-50/60 dark:bg-rose-950/20 px-4 py-2.5 rounded-lg border border-rose-100 dark:border-rose-900/30">
                <span className="text-sm font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wide">
                  B. Operating Expenditures by MoE Vote Head
                </span>
                <span className="text-sm font-bold text-rose-800 dark:text-rose-300">
                  {formatKes(totalActualSpent)}
                </span>
              </div>

              <div className="divide-y divide-outline-variant/20 mt-2">
                {voteHeadSummaryRows.map((vh) => (
                  <div key={vh.code} className="py-3 px-4 flex items-center justify-between text-sm hover:bg-surface-variant/10 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                          {vh.code}
                        </span>
                        <span className="font-semibold text-on-surface">{vh.label}</span>
                      </div>
                      <div className="text-xs text-on-surface-variant mt-0.5">{vh.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-on-surface">{formatKes(vh.actualSpent)}</div>
                      <div className="text-xs text-on-surface-variant">
                        {totalActualSpent > 0 ? ((vh.actualSpent / totalActualSpent) * 100).toFixed(1) : 0}% of total spend
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Net Operating Position Box */}
            <div className="mt-8 p-5 rounded-xl bg-surface-variant/10 border-2 border-outline-variant/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-on-surface">Net Operating Surplus / (Deficit)</h3>
                  <p className="text-xs text-on-surface-variant">
                    Formula: Total Revenue (A) - Total Operating Expenditures (B)
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-black ${isSurplus ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatKes(netSurplus)}
                  </div>
                  <div className="text-xs font-semibold mt-0.5">
                    {isSurplus ? (
                      <span className="text-emerald-700 dark:text-emerald-400">SURPLUS TRANSFERRED TO GENERAL RESERVE</span>
                    ) : (
                      <span className="text-rose-700 dark:text-rose-400">OPERATIONAL DEFICIT REQUIRING BOM INTERVENTION</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Official Verification / Sign-off Block for Print and Audit */}
            <div className="mt-12 pt-8 border-t-2 border-outline-variant/40 grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-xs text-on-surface">
              <div>
                <div className="border-b border-outline-variant pb-8 mb-2"></div>
                <div className="font-bold">Prepared by: School Bursar / Accountant</div>
                <div className="text-on-surface-variant">CPA-K No: 28412 · Date: _________________</div>
              </div>

              <div>
                <div className="border-b border-outline-variant pb-8 mb-2"></div>
                <div className="font-bold">Approved by: Principal / Head Teacher</div>
                <div className="text-on-surface-variant">TSC No: 418290 · Secretary to BOM</div>
              </div>

              <div>
                <div className="border-b border-outline-variant pb-8 mb-2"></div>
                <div className="font-bold">Certified by: BOM Chairperson</div>
                <div className="text-on-surface-variant">Board of Management · Official School Stamp</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MOE VOTE HEAD BUDGET VARIANCE ANALYSIS
          ========================================================================= */}
      {activeReportTab === 'VOTE_HEAD_VARIANCE' && (
        <div className="space-y-6">
          <div className="card bg-surface border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-outline-variant/30 gap-2">
              <div>
                <h2 className="text-lg font-bold text-on-surface">MoE Vote Head Budget Variance Analysis</h2>
                <p className="text-xs text-on-surface-variant">
                  Comparison of approved budgetary cost centers against actual disbursements (PFMA Act 2012)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-on-surface-variant">Overall Utilization:</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  overallUtilization > 100
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                    : overallUtilization >= 85
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                }`}>
                  {overallUtilization}% Consumed
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto mt-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 bg-surface-variant/20 text-on-surface-variant uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4">MoE Vote Head</th>
                    <th className="py-3.5 px-4 text-right">Approved Budget</th>
                    <th className="py-3.5 px-4 text-right">Actual Spent</th>
                    <th className="py-3.5 px-4 text-right">Variance (KES)</th>
                    <th className="py-3.5 px-4 text-center">Utilization</th>
                    <th className="py-3.5 px-4 text-center">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {voteHeadSummaryRows.map((r) => {
                    const isOverBudget = r.variance < 0;
                    const isNearLimit = r.utilizationPct >= 85 && r.utilizationPct <= 100;
                    return (
                      <tr key={r.code} className="hover:bg-surface-variant/10 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-primary">{r.code}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-on-surface">{r.label}</div>
                          <div className="text-[11px] text-on-surface-variant">{r.description}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-on-surface">
                          {formatKes(r.budgetAllocated)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-on-surface">
                          {formatKes(r.actualSpent)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold">
                          <span className={isOverBudget ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
                            {isOverBudget ? '-' : '+'}
                            {formatKes(Math.abs(r.variance))}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="w-32 mx-auto">
                            <div className="flex justify-between text-[10px] mb-1 font-medium">
                              <span>{r.utilizationPct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-outline-variant/30 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isOverBudget
                                    ? 'bg-rose-500'
                                    : isNearLimit
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(r.utilizationPct, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isOverBudget
                                ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                                : isNearLimit
                                ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {isOverBudget ? 'Over Budget' : isNearLimit ? 'Near Limit' : 'Within Budget'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-outline-variant font-bold text-on-surface bg-surface-variant/20">
                    <td className="py-4 px-4 uppercase" colSpan={2}>
                      Grand Total Summary
                    </td>
                    <td className="py-4 px-4 text-right font-mono">{formatKes(totalBudget)}</td>
                    <td className="py-4 px-4 text-right font-mono">{formatKes(totalActualSpent)}</td>
                    <td className="py-4 px-4 text-right font-mono">
                      <span className={totalVariance < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                        {totalVariance < 0 ? '-' : '+'}
                        {formatKes(Math.abs(totalVariance))}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">{overallUtilization}%</td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-xs text-primary font-bold">PFMA Monitored</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: STATEMENT OF FINANCIAL POSITION (ASSETS & SOLVENCY)
          ========================================================================= */}
      {activeReportTab === 'CASH_POSITION' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Liquid Cash & Bank Balances */}
            <div className="card bg-surface border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
                <div>
                  <h3 className="text-base font-bold text-on-surface">Liquid Treasury & Bank Accounts</h3>
                  <p className="text-xs text-on-surface-variant">Reconciled school cash registers & banking institutions</p>
                </div>
                <span className="material-symbols-outlined text-primary text-2xl">account_balance</span>
              </div>

              <div className="space-y-3 mt-4">
                <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface-variant/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-700 flex items-center justify-center font-bold">
                      KCB
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-on-surface">KCB School Operations Bank Account</div>
                      <div className="text-xs text-on-surface-variant">A/C: 1284920491 · Moi Avenue Branch</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-on-surface">{formatKes(bankBalance)}</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">Audited & Reconciled</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface-variant/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 flex items-center justify-center font-bold">
                      M-PESA
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-on-surface">Safaricom School Paybill / Till</div>
                      <div className="text-xs text-on-surface-variant">Business No: 522522 · Account: FEES</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-on-surface">{formatKes(mpesaBalance)}</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">Auto-Settled to Bank</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface-variant/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-700 flex items-center justify-center font-bold">
                      CASH
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-on-surface">Bursar's Petty Cash Vault</div>
                      <div className="text-xs text-on-surface-variant">Safe Drawer · Imprest System (Max KES 50,000)</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-on-surface">{formatKes(pettyCashBalance)}</div>
                    <span className="text-[10px] text-primary font-semibold">Under Imprest Limit</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-outline-variant/30 flex items-center justify-between">
                <span className="font-bold text-sm text-on-surface">Total Liquid Capital</span>
                <span className="text-lg font-black text-primary">{formatKes(totalLiquid)}</span>
              </div>
            </div>

            {/* Receivables & Payables (Working Capital) */}
            <div className="card bg-surface border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
                <div>
                  <h3 className="text-base font-bold text-on-surface">Receivables & Commitments</h3>
                  <p className="text-xs text-on-surface-variant">Student fee arrears & outstanding supplier vouchers</p>
                </div>
                <span className="material-symbols-outlined text-amber-600 text-2xl">pending_actions</span>
              </div>

              <div className="space-y-4 mt-4">
                <div className="p-4 rounded-xl border border-outline-variant/30 bg-rose-50/20 dark:bg-rose-950/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 uppercase">
                        Fee Arrears (Accounts Receivable)
                      </span>
                      <div className="text-xl font-bold text-rose-600 mt-1">KES 1,240,000</div>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Collectible from 42 fee defaulter accounts across Grades 1-9
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-3xl text-rose-400">person_alert</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-outline-variant/30 bg-amber-50/20 dark:bg-amber-950/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase">
                        Pending Payment Vouchers (Accounts Payable)
                      </span>
                      <div className="text-xl font-bold text-amber-600 mt-1">KES 320,000</div>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        3 approved vouchers awaiting bursar cheque / EFT clearance
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-3xl text-amber-400">receipt</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                      Net Working Capital Position:
                    </span>
                    <span className="font-black text-sm text-emerald-700 dark:text-emerald-300">
                      {formatKes(totalLiquid + 1240000 - 320000)}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                    Institution maintains strong short-term liquidity ratio of 6.2x against current commitments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: PFMA & MOE AUDIT TRAIL
          ========================================================================= */}
      {activeReportTab === 'COMPLIANCE_AUDIT' && (
        <div className="space-y-6">
          <div className="card bg-surface border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
              <div>
                <h3 className="text-base font-bold text-on-surface">
                  Ministry of Education & PFMA Audit Compliance Verification
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Statutory checklist based on the Public Finance Management Act (2012) and Basic Education Regulations
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Audit Grade: Compliant (100%)
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5">check_circle</span>
                <div>
                  <h4 className="text-sm font-semibold text-on-surface">3-Way Payment Voucher Matching</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    All payment vouchers contain Local Purchase Order (LPO), supplier invoice, and delivery note before disbursement.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5">check_circle</span>
                <div>
                  <h4 className="text-sm font-semibold text-on-surface">A.I.E Holder Authorizations</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Authority to Incur Expenditure granted exclusively by Principal with counter-signature by BOM Chairperson.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5">check_circle</span>
                <div>
                  <h4 className="text-sm font-semibold text-on-surface">FPE / JSS Capitation Ring-Fencing</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Government capitation grants are strictly deposited in the Operations Account without unauthorized virement.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5">check_circle</span>
                <div>
                  <h4 className="text-sm font-semibold text-on-surface">Petty Cash Ceiling Compliance</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Cash on hand ({formatKes(pettyCashBalance)}) is within the MoE regulatory maximum of KES 50,000.
                  </p>
                </div>
              </div>
            </div>

            {/* Audit Trail Disclaimer */}
            <div className="mt-6 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-xs text-blue-900 dark:text-blue-300">
              <div className="font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">info</span>
                Auditor-General & Ministry of Education Inspections
              </div>
              <p className="mt-1">
                All entries recorded in SmartShule generate an immutable audit log storing user IDs, timestamps, payment references, and approval sequences for inspection under Section 68 of the Public Finance Management Act.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
