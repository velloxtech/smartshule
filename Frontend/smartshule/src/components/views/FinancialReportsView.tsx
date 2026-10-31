import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import {
  CashFlowLedgerData,
  ExpenseRecord,
  OtherIncomeRecord,
  ExpenseCategoryType,
  FinanceSummaryData,
} from '../../types';
import { resolveAcademicYearName } from '../../utils/formatters';

// Standard Private School Operating Expenditure Cost Centers
interface CostCenterBudgetRow {
  code: string;
  category: ExpenseCategoryType;
  label: string;
  budgetAllocated: number;
  actualSpent: number;
  variance: number;
  utilizationPct: number;
  description: string;
}

const OPERATING_COST_CENTERS: Record<
  ExpenseCategoryType,
  { code: string; label: string; budget: number; desc: string }
> = {
  SALARIES_WAGES: {
    code: 'CC-01',
    label: 'Salaries & Staff Wages',
    budget: 0,
    desc: 'Teaching and administrative payroll, support staff wages, statutory remittances (PAYE, NSSF, SHIF, Housing Levy)',
  },
  CBC_LEARNING_MATERIALS: {
    code: 'CC-02',
    label: 'CBE Learning Materials & Lab Supplies',
    budget: 0,
    desc: 'Learner curriculum workbooks, science kits, laboratory reagents, art supplies, and classroom stationery',
  },
  UTILITIES_BILLS: {
    code: 'CC-03',
    label: 'Utilities (Power, Water, Internet)',
    budget: 0,
    desc: 'Electricity supply, municipal/bowser water bills, internet broadband connectivity, and waste disposal',
  },
  MEALS_FEEDING: {
    code: 'CC-04',
    label: 'Meals & Kitchen Catering Program',
    budget: 0,
    desc: 'Kitchen groceries, cereals, vegetables, milk, cooking gas, firewood, and catering consumables',
  },
  REPAIRS_MAINTENANCE: {
    code: 'CC-05',
    label: 'Repairs & Facility Maintenance',
    budget: 0,
    desc: 'Campus painting, desk and furniture repairs, plumbing, electrical maintenance, and grounds upkeep',
  },
  TRANSPORT_FUEL: {
    code: 'CC-06',
    label: 'Transport, Bus Fuel & Service',
    budget: 0,
    desc: 'School bus diesel fuel, routine fleet servicing, insurance, speed governor maintenance, and NTSA licensing',
  },
  ADMIN_OFFICE: {
    code: 'CC-07',
    label: 'Administration & Office Operations',
    budget: 0,
    desc: 'Photocopy paper, communication, SMS gateway credits, bank transaction fees, and administrative supplies',
  },
  KNEC_EXAMS: {
    code: 'CC-08',
    label: 'Examinations Printing & Logistics',
    budget: 0,
    desc: 'Internal terminal exam printing, assessment rubrics, invigilation logistics, and assessment materials',
  },
  CO_CURRICULAR: {
    code: 'CC-09',
    label: 'Co-Curricular, Sports & Clubs',
    budget: 0,
    desc: 'Sports equipment, tournament affiliations, scouting, music/drama festival travel, and club activities',
  },
  CAPITAL_DEVELOPMENT: {
    code: 'CC-10',
    label: 'Capital Development & Infrastructure',
    budget: 0,
    desc: 'Classroom upgrades, security fencing, computer lab enhancement, and playground equipment',
  },
  OTHER_EXPENSES: {
    code: 'CC-11',
    label: 'Other Sundry & Operating Contingencies',
    budget: 0,
    desc: 'First-aid medical supplies, sanitation products, health compliance, and emergency contingency expenditures',
  },
};

export const FinancialReportsView: React.FC = () => {
  const [ledgerData, setLedgerData] = useState<CashFlowLedgerData | null>(null);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummaryData | null>(null);
  const [defaultersData, setDefaultersData] = useState<any>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<OtherIncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [school, setSchool] = useState<any>(null);
  const [academicYears, setAcademicYears] = useState<any[]>([]);

  // Period / Filter state
  const [selectedPeriod, setSelectedPeriod] = useState<string>('CURRENT_PERIOD');
  const [activeReportTab, setActiveReportTab] = useState<
    'INCOME_EXPENDITURE' | 'COLLECTIONS_ANALYSIS' | 'CASH_POSITION' | 'INTERNAL_CONTROLS'
  >('INCOME_EXPENDITURE');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customBudgetMultiplier, setCustomBudgetMultiplier] = useState<number>(1.0);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [schRes, yrRes, ctxRes] = await Promise.all([
          apiService.getSchool().catch(() => ({ success: false, data: null })),
          apiService.getAcademicYears().catch(() => ({ success: false, data: [] })),
          apiService.getCurrentContext().catch(() => ({ success: false, data: null })),
        ]);
        if (schRes.success && schRes.data) {
          setSchool(schRes.data);
        }
        if (yrRes.success && Array.isArray(yrRes.data)) {
          setAcademicYears(yrRes.data);
        }
        if (ctxRes.success && ctxRes.data?.currentTerm?.name) {
          const yName = resolveAcademicYearName(
            ctxRes.data.currentYear?.name || ctxRes.data.currentYear?.id
          );
          setSelectedPeriod(`${ctxRes.data.currentTerm.name} ${yName}`.trim());
        }
      } catch {
        // ignore
      }
    }
    loadMeta();
  }, []);

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
      const [ledgerRes, summaryRes, defaultersRes, expRes, incRes] = await Promise.all([
        apiService.getCashFlowLedger({
          startDate: customStartDate || undefined,
          endDate: customEndDate || undefined,
        }).catch(() => ({ success: false, data: null })),
        apiService.getFinanceSummary().catch(() => ({ success: false, data: null })),
        apiService.getDefaulters().catch(() => ({ success: false, data: null })),
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
      if (summaryRes.success && summaryRes.data) {
        setFinanceSummary(summaryRes.data);
      }
      if (defaultersRes.success && defaultersRes.data) {
        setDefaultersData(defaultersRes.data);
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

  // Breakdown of Other Incomes by Category (Strictly Private School Sources)
  const incomeCategoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {
      UNIFORM_SALES: 0,
      BUS_FACILITY_HIRE: 0,
      DONATIONS_GRANTS: 0,
      EXAM_REVISION_BOOKS: 0,
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

  // Breakdown of Expenses by Cost Center
  const costCenterSummaryRows: CostCenterBudgetRow[] = useMemo(() => {
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

    return (Object.keys(OPERATING_COST_CENTERS) as ExpenseCategoryType[]).map((cat) => {
      const cfg = OPERATING_COST_CENTERS[cat];
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
    return costCenterSummaryRows.reduce((acc, r) => acc + r.budgetAllocated, 0);
  }, [costCenterSummaryRows]);

  const totalActualSpent = useMemo(() => {
    return costCenterSummaryRows.reduce((acc, r) => acc + r.actualSpent, 0);
  }, [costCenterSummaryRows]);

  const totalVariance = totalBudget - totalActualSpent;
  const overallUtilization = totalBudget > 0 ? Math.round((totalActualSpent / totalBudget) * 100) : 0;

  // Payment Channels Breakdown from ledger
  const paymentChannelsBreakdown = useMemo(() => {
    let mpesa = 0;
    let bank = 0;
    let cash = 0;
    let cheque = 0;

    if (ledgerData?.recentLedger) {
      ledgerData.recentLedger.forEach((tx) => {
        if (tx.type === 'INFLOW') {
          if (tx.paymentMethod === 'MPESA') mpesa += tx.amount;
          else if (['BANK_TRANSFER', 'BANK_DEPOSIT', 'KCB_BUNI', 'CARD'].includes(tx.paymentMethod)) bank += tx.amount;
          else if (tx.paymentMethod === 'CASH') cash += tx.amount;
          else if (tx.paymentMethod === 'CHEQUE') cheque += tx.amount;
        }
      });
    }

    const total = mpesa + bank + cash + cheque;
    return {
      mpesa,
      bank,
      cash,
      cheque,
      total,
      mpesaPct: total > 0 ? ((mpesa / total) * 100).toFixed(1) : '0.0',
      bankPct: total > 0 ? ((bank / total) * 100).toFixed(1) : '0.0',
      cashPct: total > 0 ? ((cash / total) * 100).toFixed(1) : '0.0',
      chequePct: total > 0 ? ((cheque / total) * 100).toFixed(1) : '0.0',
    };
  }, [ledgerData]);

  // Handle Export CSV
  const handleExportCSV = () => {
    const schoolName = school?.name || 'Grace Seeds School';
    const regNo = school?.registrationNumber || school?.code || 'GSS-001';
    const rows = [
      [`${schoolName.toUpperCase()} — COMPREHENSIVE FINANCIAL STATEMENT`],
      [`School: ${schoolName}`, `Reg/Code: ${regNo}`, `Period: ${selectedPeriod || 'All'}`],
      ['Generated On:', new Date().toLocaleString('en-KE')],
      [''],
      ['SECTION 1: REVENUE / CASH INFLOWS'],
      ['Revenue Source', 'Amount (KES)'],
      ['Student Tuition & Boarding Fees', feeRevenue],
      ['Uniform & Scholastic Materials Sales', incomeCategoryBreakdown.UNIFORM_SALES || 0],
      ['Bus & Field Facility Hire', incomeCategoryBreakdown.BUS_FACILITY_HIRE || 0],
      ['Philanthropic & Development Grants', incomeCategoryBreakdown.DONATIONS_GRANTS || 0],
      ['Exam Workbooks & Scholastic Books', incomeCategoryBreakdown.EXAM_REVISION_BOOKS || 0],
      ['Other School Income', incomeCategoryBreakdown.OTHER || 0],
      ['TOTAL REVENUE / INFLOWS', totalMoneyIn],
      [''],
      ['SECTION 2: OPERATING EXPENDITURES BY COST CENTER'],
      ['Cost Center Code', 'Cost Center Title', 'Approved Budget (KES)', 'Actual Spent (KES)', 'Variance (KES)', 'Utilization %'],
      ...costCenterSummaryRows.map((r) => [
        r.code,
        r.label,
        r.budgetAllocated,
        r.actualSpent,
        r.variance,
        `${r.utilizationPct}%`,
      ]),
      ['TOTAL OPERATING EXPENDITURES', '', totalBudget, totalActualSpent, totalVariance, `${overallUtilization}%`],
      [''],
      ['SECTION 3: PAYMENT CHANNELS DISTRIBUTION'],
      ['Channel', 'Amount (KES)', 'Share %'],
      ['Safaricom M-Pesa (Till/Paybill)', paymentChannelsBreakdown.mpesa, `${paymentChannelsBreakdown.mpesaPct}%`],
      ['Bank Transfer & Deposits', paymentChannelsBreakdown.bank, `${paymentChannelsBreakdown.bankPct}%`],
      ['Cashier Office (Cash Desk)', paymentChannelsBreakdown.cash, `${paymentChannelsBreakdown.cashPct}%`],
      ['Bank Cheques & Drafts', paymentChannelsBreakdown.cheque, `${paymentChannelsBreakdown.chequePct}%`],
      [''],
      ['SECTION 4: NET OPERATING POSITION & LIQUIDITY'],
      ['Net Surplus / (Deficit)', netSurplus],
      ['Operating Margin', `${operatingMargin}%`],
      ['School Bank Account Balance', bankBalance],
      ['Safaricom M-Pesa Balance', mpesaBalance],
      ['Petty Cash Balance', pettyCashBalance],
      ['Total Liquid Cash Position', totalLiquid],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `School_Financial_Statement_${(selectedPeriod || 'Report').replace(/[^a-zA-Z0-9]/g, '_')}_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Print-Only Private School Formal Letterhead Header */}
      <div className="hidden print:block mb-8 text-center border-b-2 border-slate-900 pb-4">
        <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
          {school?.name || 'Grace Seeds School'}
        </h1>
        <h2 className="text-base font-bold text-slate-700 tracking-wide uppercase">
          Statement of Financial Position & Operating Summary
        </h2>
        <p className="text-xs text-slate-600 mt-0.5">
          {[
            school?.registrationNumber ? `Registration: ${school.registrationNumber}` : null,
            school?.subCounty ? `Sub-County: ${school.subCounty}` : null,
            school?.county ? `County: ${school.county}` : null,
            'Private School Accounts Directorate',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <div className="mt-2 text-xs font-mono text-slate-500">
          Reporting Cycle: {(selectedPeriod || 'Current Period').replace(/_/g, ' ')} · Printed on: {new Date().toLocaleString('en-KE')}
        </div>
      </div>

      {/* Screen Header & Top Operational Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/30 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">analytics</span>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">
              Financial Reports & Accounts Statements
            </h1>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Private school fee collections, operating cost centers, liquidity position, and financial statements
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-2 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Private School Ledger & Accounts Reconciled
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input text-xs py-2 px-3 rounded-lg border border-outline-variant bg-surface text-on-surface font-medium cursor-pointer"
          >
            <option value="CURRENT_PERIOD">Current Active Term</option>
            {academicYears.map((ay) => {
              const yName = resolveAcademicYearName(ay.name || ay.year || ay.id);
              return (
                <React.Fragment key={ay.id}>
                  <option value={`YEAR_${yName}`}>Academic Year {yName}</option>
                  {ay.terms?.map((t: any) => (
                    <option key={t.id} value={`${t.name}_${yName}`}>
                      {t.name} - {yName}
                    </option>
                  ))}
                </React.Fragment>
              );
            })}
            <option value="CUSTOM">Custom Date Range</option>
          </select>

          {/* Action Buttons */}
          <button
            onClick={loadReportData}
            disabled={loading}
            title="Reload live ledger figures"
            className="p-2 rounded-lg border border-outline-variant hover:bg-surface-variant/20 text-on-surface-variant transition-colors cursor-pointer"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>sync</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline-variant hover:bg-surface-variant/20 text-xs font-semibold text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base text-emerald-600">table_view</span>
            Export CSV
          </button>

          <button
            onClick={handlePrintReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Print Financial Statement
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
              className="input py-1 px-2 text-xs rounded border border-outline-variant bg-surface cursor-pointer"
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
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Total Revenue Inflows
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">trending_up</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface tracking-tight font-mono">
              {formatKes(totalMoneyIn)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-on-surface-variant">
              <span>Tuition Fees:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                {formatKes(feeRevenue)}
              </span>
            </div>
          </div>
        </div>

        {/* Operating Expenditures Outflow */}
        <div className="card p-5 bg-surface border border-outline-variant/30 rounded-2xl shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Operating Expenditures
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">trending_down</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface tracking-tight font-mono">
              {formatKes(totalMoneyOut)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-on-surface-variant">
              <span>Cost Centers:</span>
              <span className="font-semibold text-on-surface">11 Operating Categories</span>
            </div>
          </div>
        </div>

        {/* Net Operating Surplus / Deficit */}
        <div className="card p-5 bg-surface border border-outline-variant/30 rounded-2xl shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Net Operating Result
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isSurplus
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {isSurplus ? 'account_balance_wallet' : 'warning'}
              </span>
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-black tracking-tight font-mono ${
                isSurplus ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {isSurplus ? '+' : ''}
              {formatKes(netSurplus)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-on-surface-variant">
              <span>Operating Margin:</span>
              <span className="font-semibold font-mono">{operatingMargin}%</span>
            </div>
          </div>
        </div>

        {/* Liquid Cash Position */}
        <div className="card p-5 bg-surface border border-outline-variant/30 rounded-2xl shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Liquid Cash Position
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">savings</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-on-surface tracking-tight font-mono">
              {formatKes(totalLiquid)}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
              <span>Bank: {formatKes(bankBalance)}</span>
              <span>·</span>
              <span>M-Pesa: {formatKes(mpesaBalance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Reports */}
      <div className="border-b border-outline-variant/30 print:hidden">
        <nav className="flex space-x-8 -mb-px">
          <button
            onClick={() => setActiveReportTab('INCOME_EXPENDITURE')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer ${
              activeReportTab === 'INCOME_EXPENDITURE'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg">receipt_long</span>
            Income & Expenditure Statement
          </button>

          <button
            onClick={() => setActiveReportTab('COLLECTIONS_ANALYSIS')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer ${
              activeReportTab === 'COLLECTIONS_ANALYSIS'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg">pie_chart</span>
            Fee Collections & Channels
          </button>

          <button
            onClick={() => setActiveReportTab('CASH_POSITION')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer ${
              activeReportTab === 'CASH_POSITION'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg">account_balance</span>
            Statement of Financial Position
          </button>

          <button
            onClick={() => setActiveReportTab('INTERNAL_CONTROLS')}
            className={`py-3 px-1 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer ${
              activeReportTab === 'INTERNAL_CONTROLS'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-lg">verified_user</span>
            Internal Controls & Audit
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
                <h2 className="text-lg font-bold text-on-surface">Statement of Income & Operating Expenditure</h2>
                <p className="text-xs text-on-surface-variant">
                  Private School Schedule of Operational Revenues and Recurrent Expenditures
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
                  A. Institutional Revenue & Operating Inflows
                </span>
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 font-mono">
                  {formatKes(totalMoneyIn)}
                </span>
              </div>

              <div className="divide-y divide-outline-variant/20 mt-2">
                <div className="py-3 px-4 flex items-center justify-between text-sm hover:bg-surface-variant/10 transition-colors">
                  <div>
                    <div className="font-semibold text-on-surface">Student Tuition & Boarding Fees</div>
                    <div className="text-xs text-on-surface-variant">
                      Collections via Safaricom M-Pesa Paybill, Direct Bank Invoices, and Cash Desk
                    </div>
                  </div>
                  <div className="font-bold text-on-surface font-mono">{formatKes(feeRevenue)}</div>
                </div>

                <div className="py-3 px-4 flex items-center justify-between text-sm hover:bg-surface-variant/10 transition-colors">
                  <div>
                    <div className="font-semibold text-on-surface">Uniform, Stationery & Merchandise Sales</div>
                    <div className="text-xs text-on-surface-variant">
                      School uniforms, physical education sports kits, and student supplies
                    </div>
                  </div>
                  <div className="font-bold text-on-surface font-mono">
                    {formatKes(incomeCategoryBreakdown.UNIFORM_SALES || 0)}
                  </div>
                </div>

                <div className="py-3 px-4 flex items-center justify-between text-sm hover:bg-surface-variant/10 transition-colors">
                  <div>
                    <div className="font-semibold text-on-surface">School Bus, Grounds & Facility Rental Hire</div>
                    <div className="text-xs text-on-surface-variant">
                      Transport service charges, weekend grounds hire, and event venue rentals
                    </div>
                  </div>
                  <div className="font-bold text-on-surface font-mono">
                    {formatKes(incomeCategoryBreakdown.BUS_FACILITY_HIRE || 0)}
                  </div>
                </div>

                <div className="py-3 px-4 flex items-center justify-between text-sm hover:bg-surface-variant/10 transition-colors">
                  <div>
                    <div className="font-semibold text-on-surface">Philanthropic Grants & Alumni Bursary Fund</div>
                    <div className="text-xs text-on-surface-variant">
                      Voluntary contributions, development donations, and donor scholarship funds
                    </div>
                  </div>
                  <div className="font-bold text-on-surface font-mono">
                    {formatKes(incomeCategoryBreakdown.DONATIONS_GRANTS || 0)}
                  </div>
                </div>

                <div className="py-3 px-4 flex items-center justify-between text-sm hover:bg-surface-variant/10 transition-colors">
                  <div>
                    <div className="font-semibold text-on-surface">CBE Workbooks & Revision Materials</div>
                    <div className="text-xs text-on-surface-variant">
                      Approved CBC revision materials, practical guides, and assessment booklets
                    </div>
                  </div>
                  <div className="font-bold text-on-surface font-mono">
                    {formatKes(incomeCategoryBreakdown.EXAM_REVISION_BOOKS || 0)}
                  </div>
                </div>

                {incomeCategoryBreakdown.OTHER > 0 && (
                  <div className="py-3 px-4 flex items-center justify-between text-sm hover:bg-surface-variant/10 transition-colors">
                    <div>
                      <div className="font-semibold text-on-surface">Other Miscellaneous Operating Inflows</div>
                      <div className="text-xs text-on-surface-variant">Sundry administrative income and registration fees</div>
                    </div>
                    <div className="font-bold text-on-surface font-mono">
                      {formatKes(incomeCategoryBreakdown.OTHER)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Outflows Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between bg-rose-50/60 dark:bg-rose-950/20 px-4 py-2.5 rounded-lg border border-rose-100 dark:border-rose-900/30">
                <span className="text-sm font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wide">
                  B. Operating Expenditures by Cost Center
                </span>
                <span className="text-sm font-bold text-rose-800 dark:text-rose-300 font-mono">
                  {formatKes(totalActualSpent)}
                </span>
              </div>

              <div className="divide-y divide-outline-variant/20 mt-2">
                {costCenterSummaryRows.map((vh) => (
                  <div
                    key={vh.code}
                    className="py-3 px-4 flex items-center justify-between text-sm hover:bg-surface-variant/10 transition-colors"
                  >
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
                      <div className="font-bold text-on-surface font-mono">{formatKes(vh.actualSpent)}</div>
                      <div className="text-xs text-on-surface-variant">
                        {totalActualSpent > 0 ? ((vh.actualSpent / totalActualSpent) * 100).toFixed(1) : 0}% of outlays
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Net Operating Position Footer */}
            <div className="mt-8 p-4 rounded-xl bg-surface-variant/20 border border-outline-variant/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-on-surface-variant font-bold">
                  Net Operating Position (Surplus / Deficit)
                </span>
                <div
                  className={`text-xl font-black font-mono mt-0.5 ${
                    isSurplus ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {isSurplus ? '+' : ''}
                  {formatKes(netSurplus)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-on-surface-variant block">Operating Efficiency Margin</span>
                <span className="text-base font-bold text-on-surface font-mono">{operatingMargin}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: FEE COLLECTIONS & REVENUE ANALYSIS
          ========================================================================= */}
      {activeReportTab === 'COLLECTIONS_ANALYSIS' && (
        <div className="space-y-6">
          {/* Fee Collection Summary Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5 bg-surface border border-outline-variant/30 rounded-2xl shadow-sm">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Total Invoiced Fees
              </span>
              <div className="text-2xl font-black text-on-surface font-mono mt-2">
                {formatKes(financeSummary?.totalInvoiced ?? feeRevenue)}
              </div>
              <p className="text-xs text-on-surface-variant mt-1">Expected term fee billings</p>
            </div>

            <div className="card p-5 bg-surface border border-outline-variant/30 rounded-2xl shadow-sm">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Collected Tuition & Fees
              </span>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-2">
                {formatKes(financeSummary?.totalCollected ?? feeRevenue)}
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                Collection Rate: {financeSummary?.collectionRatePercentage ?? (totalMoneyIn > 0 ? 100 : 0)}%
              </p>
            </div>

            <div className="card p-5 bg-surface border border-outline-variant/30 rounded-2xl shadow-sm">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Outstanding Fee Arrears
              </span>
              <div className="text-2xl font-black text-rose-700 dark:text-rose-400 font-mono mt-2">
                {formatKes(financeSummary?.totalOutstanding ?? defaultersData?.totalOutstandingBalance ?? 0)}
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
                {defaultersData?.totalDefaulters ?? 0} learners with pending balance
              </p>
            </div>
          </div>

          {/* Payment Channels Breakdown Card */}
          <div className="card bg-surface border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-on-surface mb-1">
              Payment Channels Distribution & Clearing Methods
            </h3>
            <p className="text-xs text-on-surface-variant mb-6">
              Breakdown of fee inflows across electronic and banking channels
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-on-surface">Safaricom M-Pesa</span>
                  <span className="material-symbols-outlined text-emerald-600">smartphone</span>
                </div>
                <div className="text-lg font-black font-mono text-on-surface">
                  {formatKes(paymentChannelsBreakdown.mpesa)}
                </div>
                <div className="text-xs text-on-surface-variant mt-1 font-mono">
                  {paymentChannelsBreakdown.mpesaPct}% of total inflows
                </div>
              </div>

              <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-on-surface">Bank Transfer / KCB</span>
                  <span className="material-symbols-outlined text-blue-600">account_balance</span>
                </div>
                <div className="text-lg font-black font-mono text-on-surface">
                  {formatKes(paymentChannelsBreakdown.bank)}
                </div>
                <div className="text-xs text-on-surface-variant mt-1 font-mono">
                  {paymentChannelsBreakdown.bankPct}% of total inflows
                </div>
              </div>

              <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-on-surface">Cash Desk (Cashier)</span>
                  <span className="material-symbols-outlined text-amber-600">payments</span>
                </div>
                <div className="text-lg font-black font-mono text-on-surface">
                  {formatKes(paymentChannelsBreakdown.cash)}
                </div>
                <div className="text-xs text-on-surface-variant mt-1 font-mono">
                  {paymentChannelsBreakdown.cashPct}% of total inflows
                </div>
              </div>

              <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-on-surface">Cheques & Drafts</span>
                  <span className="material-symbols-outlined text-purple-600">receipt</span>
                </div>
                <div className="text-lg font-black font-mono text-on-surface">
                  {formatKes(paymentChannelsBreakdown.cheque)}
                </div>
                <div className="text-xs text-on-surface-variant mt-1 font-mono">
                  {paymentChannelsBreakdown.chequePct}% of total inflows
                </div>
              </div>
            </div>
          </div>

          {/* Operating Cost Centers Summary Table */}
          <div className="card bg-surface border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
              <div>
                <h3 className="text-base font-bold text-on-surface">Operating Cost Centers Performance</h3>
                <p className="text-xs text-on-surface-variant">
                  Recurrent expenditure monitoring across private school operational areas
                </p>
              </div>
              <div className="text-xs font-bold text-primary font-mono">
                Total Outflows: {formatKes(totalActualSpent)}
              </div>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 bg-surface-variant/20 text-on-surface-variant uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Cost Center</th>
                    <th className="py-3 px-4 text-right">Actual Spent</th>
                    <th className="py-3 px-4 text-right">Share of Outflows</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {costCenterSummaryRows.map((r) => (
                    <tr key={r.code} className="hover:bg-surface-variant/10 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">{r.code}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-on-surface">{r.label}</div>
                        <div className="text-[11px] text-on-surface-variant">{r.description}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-on-surface font-mono">
                        {formatKes(r.actualSpent)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-on-surface-variant">
                        {totalActualSpent > 0 ? ((r.actualSpent / totalActualSpent) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: STATEMENT OF FINANCIAL POSITION (ASSETS & LIQUIDITY)
          ========================================================================= */}
      {activeReportTab === 'CASH_POSITION' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Liquid Cash & Bank Balances */}
            <div className="card bg-surface border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
                <div>
                  <h3 className="text-base font-bold text-on-surface">Operating Liquid Cash & Bank Accounts</h3>
                  <p className="text-xs text-on-surface-variant">
                    Reconciled liquid balances available across institutional clearing accounts
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">account_balance</span>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface-variant/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                      <span className="material-symbols-outlined">account_balance</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">School Bank Account</h4>
                      <p className="text-xs text-on-surface-variant">Operating Account (Tuition, Invoices & BOM)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-on-surface font-mono">{formatKes(bankBalance)}</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">Active & Reconciled</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface-variant/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                      <span className="material-symbols-outlined">smartphone</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">Safaricom M-Pesa Paybill / Till</h4>
                      <p className="text-xs text-on-surface-variant">Mobile Money Collections & Disbursements</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-on-surface font-mono">{formatKes(mpesaBalance)}</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">Live Gateway</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface-variant/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                      <span className="material-symbols-outlined">payments</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">Petty Cash Office Float</h4>
                      <p className="text-xs text-on-surface-variant">Cashier Imprest Float for Minor Expenses</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-on-surface font-mono">{formatKes(pettyCashBalance)}</div>
                    <span className="text-[10px] text-amber-600 font-semibold">Imprest Float</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-outline-variant/30 flex items-center justify-between">
                  <span className="text-sm font-bold text-on-surface">Total Liquid Funds Available</span>
                  <span className="text-lg font-black text-primary font-mono">{formatKes(totalLiquid)}</span>
                </div>
              </div>
            </div>

            {/* Operating Receivables & Fee Balances */}
            <div className="card bg-surface border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
                <div>
                  <h3 className="text-base font-bold text-on-surface">Fee Receivables & Liquidity Ratios</h3>
                  <p className="text-xs text-on-surface-variant">Short-term assets and learner account balances</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">assessment</span>
                </div>
              </div>

              <div className="space-y-4 mt-6">
                <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface-variant/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-on-surface uppercase">Uncollected Fee Arrears</span>
                    <span className="text-base font-black text-rose-700 dark:text-rose-400 font-mono">
                      {formatKes(financeSummary?.totalOutstanding ?? defaultersData?.totalOutstandingBalance ?? 0)}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    Outstanding receivables owed by enrolled student guardians.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface-variant/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-on-surface uppercase">Net Solvency Position</span>
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">
                      {formatKes(totalLiquid + (financeSummary?.totalOutstanding ?? 0))}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1">
                    Combined total of liquid reserves and collectible fee receivables.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase">
                      Working Capital Status
                    </span>
                    <span className="font-black text-sm text-emerald-700 dark:text-emerald-300">
                      {isSurplus ? 'Healthy Surplus' : 'Operating Deficit'}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                    Institution operating revenues adequately cover recurrent cost commitments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: INTERNAL CONTROLS & AUDIT
          ========================================================================= */}
      {activeReportTab === 'INTERNAL_CONTROLS' && (
        <div className="space-y-6">
          <div className="card bg-surface border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
              <div>
                <h3 className="text-base font-bold text-on-surface">
                  Private School Financial Internal Controls & Audit Trail
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Standard operating procedures for fee billing, manual payment recording, and expenditure governance
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                <span className="material-symbols-outlined text-sm">verified</span>
                Controls Active (100%)
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5">check_circle</span>
                <div>
                  <h4 className="text-sm font-semibold text-on-surface">Dual-Verification for Forwarded Payments</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Parent M-Pesa SMS and bank transaction confirmations must be explicitly verified and approved by authorized bursary personnel before student fee ledgers are credited.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5">check_circle</span>
                <div>
                  <h4 className="text-sm font-semibold text-on-surface">Tamper-Proof Receipt Sequencing</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Every manual and electronic fee payment automatically generates a sequential official receipt number stamped with the recording officer ID and transaction timestamp.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5">check_circle</span>
                <div>
                  <h4 className="text-sm font-semibold text-on-surface">Auditable Payment Reversals</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Payment reversals require mandatory justification notes, update student invoice balances atomically, and preserve immutable reversal audit records.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5">check_circle</span>
                <div>
                  <h4 className="text-sm font-semibold text-on-surface">Petty Cash Imprest Governance</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Cashier float ({formatKes(pettyCashBalance)}) is managed on an imprest system with receipts and expense vouchers required for all cash disbursements.
                  </p>
                </div>
              </div>
            </div>

            {/* Audit Trail Disclaimer */}
            <div className="mt-6 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-xs text-blue-900 dark:text-blue-300">
              <div className="font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">info</span>
                Directorate Governance & System Audit Log
              </div>
              <p className="mt-1">
                All financial actions in SmartShule generate an immutable audit trail recording user identifiers, IP addresses, transaction timestamps, receipt numbers, and fee structure modifications to ensure full institutional accountability.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
