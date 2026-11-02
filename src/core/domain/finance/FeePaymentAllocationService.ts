import { StudentInvoice, InvoiceStatus, PaymentAllocationItem } from './Fee';

export interface FeeObligationItem {
  invoice: StudentInvoice;
  amount: number;
}

export interface FeeObligations {
  studentId: string;
  previousTermArrearsOutstanding: number;
  currentTermBilledFeesOutstanding: number;
  totalOutstanding: number;
  arrearsItems: Array<{
    invoice: StudentInvoice;
    amount: number;
  }>;
  currentTermItems: Array<{
    invoice: StudentInvoice;
    amount: number;
  }>;
}

export interface PaymentAllocationResult {
  paymentAmount: number;
  previousTermArrearsOutstanding: number;
  currentTermBilledFeesOutstanding: number;
  totalOutstandingBeforePayment: number;
  arrearsPaid: number;
  currentFeesPaid: number;
  overpaymentAmount: number;
  remainingArrears: number;
  remainingCurrentFees: number;
  totalOutstandingAfterPayment: number;
  isEligibleForOverpayment: boolean;
  explanation: string;
  invoiceAllocations: PaymentAllocationItem[];
  perInvoiceTotals: Map<string, { invoice: StudentInvoice; totalPaid: number }>;
}

export class FeePaymentAllocationService {
  /**
   * Helper to determine if a term string matches the target active term.
   */
  public static isTargetTerm(invoiceTermId?: string, targetTermId?: string): boolean {
    if (!invoiceTermId || !targetTermId || targetTermId === 'ALL') return true;
    if (invoiceTermId === targetTermId) return true;

    const lowerToCheck = invoiceTermId.toLowerCase();
    const lowerTarget = String(targetTermId).toLowerCase();

    const checkYear = lowerToCheck.match(/20\d\d/)?.[0];
    const targetYear = lowerTarget.match(/20\d\d/)?.[0];
    if (checkYear && targetYear && checkYear !== targetYear) return false;

    const targetMatch =
      lowerTarget.match(/t(?:erm)?[_-]?([1-3])\b/i) ||
      lowerTarget.match(/[-_t]([1-3])$/i) ||
      lowerTarget.match(/\b([1-3])\b/);

    if (targetMatch) {
      const num = targetMatch[1];
      const numPattern = new RegExp(`(?:^|[^0-9])(?:term[_\s-]?|t)${num}(?:[^0-9]|$)`, 'i');
      return (
        numPattern.test(lowerToCheck) ||
        lowerToCheck.endsWith(`-${num}`) ||
        lowerToCheck.endsWith(`_${num}`) ||
        lowerToCheck === num
      );
    }
    return false;
  }

  /**
   * Partitions all active unpaid obligations of a learner into:
   * 1. Previous-term arrears outstanding
   * 2. Current-term billed fees outstanding
   */
  public static calculateObligations(
    studentId: string,
    invoices: StudentInvoice[],
    activeTermId?: string,
    activeYearId?: string
  ): FeeObligations {
    const activeInvoices = invoices.filter(
      i =>
        (i.status as any) !== 'CARRIED_FORWARD' &&
        (i.status as any) !== InvoiceStatus.CARRIED_FORWARD &&
        (i.status as any) !== 'CANCELLED' &&
        (i.status as any) !== InvoiceStatus.CANCELLED &&
        i.balance > 0.001
    );

    let previousTermArrearsOutstanding = 0;
    let currentTermBilledFeesOutstanding = 0;

    const arrearsItems: Array<{ invoice: StudentInvoice; amount: number }> = [];
    const currentTermItems: Array<{ invoice: StudentInvoice; amount: number }> = [];

    // Sort invoices oldest first so arrears are settled chronologically
    const sortedInvoices = [...activeInvoices].sort((a, b) => {
      const dateA = a.dueDate || (a as any).createdAt || '';
      const dateB = b.dueDate || (b as any).createdAt || '';
      return String(dateA).localeCompare(String(dateB));
    });

    for (const inv of sortedInvoices) {
      const isManualArrear =
        inv.feeStructureId === 'MANUAL_ARREARS' ||
        (inv.invoiceNumber && inv.invoiceNumber.includes('ARR')) ||
        (inv.description && inv.description.toLowerCase().includes('manual arrears'));

      const isCurrentTerm =
        !isManualArrear &&
        activeTermId &&
        activeTermId !== 'ALL' &&
        this.isTargetTerm(inv.termId, activeTermId);

      if (isManualArrear || (!isCurrentTerm && activeTermId && activeTermId !== 'ALL')) {
        // This is a prior term or separate manual arrears invoice
        const invBalance = Math.round(inv.balance * 100) / 100;
        if (invBalance > 0) {
          previousTermArrearsOutstanding = Math.round((previousTermArrearsOutstanding + invBalance) * 100) / 100;
          arrearsItems.push({ invoice: inv, amount: invBalance });
        }
      } else {
        // This is a current term invoice (or no active term was given).
        // Check if it has carried-forward arrears fee items inside it.
        let embeddedArrears = 0;
        if (Array.isArray(inv.items)) {
          for (const it of inv.items) {
            const itName = (it.name || '').toLowerCase();
            if (
              itName.includes('arrear') ||
              itName.includes('carried forward') ||
              itName.includes('previous balance')
            ) {
              embeddedArrears += Number(it.amount) || 0;
            }
          }
        }
        embeddedArrears = Math.round(embeddedArrears * 100) / 100;

        const totalPayable = Math.round(inv.amountPayable * 100) / 100;
        const totalPaidSoFar = Math.round(inv.amountPaid * 100) / 100;
        const invBalance = Math.round(inv.balance * 100) / 100;

        if (embeddedArrears > 0) {
          // Arrears are paid first on this invoice
          const arrearsUnpaid = Math.max(0, Math.round((embeddedArrears - totalPaidSoFar) * 100) / 100);
          const actualArrearsOnThis = Math.min(arrearsUnpaid, invBalance);
          const actualCurrentOnThis = Math.max(0, Math.round((invBalance - actualArrearsOnThis) * 100) / 100);

          if (actualArrearsOnThis > 0) {
            previousTermArrearsOutstanding = Math.round((previousTermArrearsOutstanding + actualArrearsOnThis) * 100) / 100;
            arrearsItems.push({ invoice: inv, amount: actualArrearsOnThis });
          }
          if (actualCurrentOnThis > 0) {
            currentTermBilledFeesOutstanding = Math.round((currentTermBilledFeesOutstanding + actualCurrentOnThis) * 100) / 100;
            currentTermItems.push({ invoice: inv, amount: actualCurrentOnThis });
          }
        } else {
          // Pure current term invoice
          if (invBalance > 0) {
            currentTermBilledFeesOutstanding = Math.round((currentTermBilledFeesOutstanding + invBalance) * 100) / 100;
            currentTermItems.push({ invoice: inv, amount: invBalance });
          }
        }
      }
    }

    const totalOutstanding = Math.round((previousTermArrearsOutstanding + currentTermBilledFeesOutstanding) * 100) / 100;

    return {
      studentId,
      previousTermArrearsOutstanding,
      currentTermBilledFeesOutstanding,
      totalOutstanding,
      arrearsItems,
      currentTermItems
    };
  }

  /**
   * Authoritatively allocates a payment amount following the mandatory order:
   * 1. Previous-term arrears
   * 2. Current-term billed fees
   * 3. Overpayment / Fee credit (ONLY when both arrears and current fees reach 0)
   */
  public static allocatePayment(
    rawPaymentAmount: number,
    obligations: FeeObligations
  ): PaymentAllocationResult {
    const paymentAmount = Math.max(0, Math.round((Number(rawPaymentAmount) || 0) * 100) / 100);
    const arrearsOutstanding = obligations.previousTermArrearsOutstanding;
    const currentOutstanding = obligations.currentTermBilledFeesOutstanding;
    const totalOutstandingBefore = obligations.totalOutstanding;

    // Step 1: Allocate to previous-term arrears first
    const arrearsPaid = Math.min(paymentAmount, arrearsOutstanding);
    const roundedArrearsPaid = Math.round(arrearsPaid * 100) / 100;
    const remainingAfterArrears = Math.round((paymentAmount - roundedArrearsPaid) * 100) / 100;

    // Step 2: Allocate remainder to current-term billed fees
    const currentFeesPaid = Math.min(remainingAfterArrears, currentOutstanding);
    const roundedCurrentFeesPaid = Math.round(currentFeesPaid * 100) / 100;
    const remainingAfterCurrent = Math.round((remainingAfterArrears - roundedCurrentFeesPaid) * 100) / 100;

    // Step 3: Compute remaining unpaid balances
    const remainingArrears = Math.max(0, Math.round((arrearsOutstanding - roundedArrearsPaid) * 100) / 100);
    const remainingCurrentFees = Math.max(0, Math.round((currentOutstanding - roundedCurrentFeesPaid) * 100) / 100);
    const totalOutstandingAfter = Math.round((remainingArrears + remainingCurrentFees) * 100) / 100;

    // Strict eligibility condition:
    // Overpayment is permitted ONLY when previous_term_arrears_outstanding == 0 AND current_term_billed_fees_outstanding == 0
    const isEligibleForOverpayment = remainingArrears === 0 && remainingCurrentFees === 0;
    const overpaymentAmount = isEligibleForOverpayment ? remainingAfterCurrent : 0;

    // Build explanatory note
    let explanation = '';
    if (paymentAmount <= 0) {
      explanation = 'No payment amount provided.';
    } else if (isEligibleForOverpayment && overpaymentAmount > 0) {
      if (roundedArrearsPaid > 0 && roundedCurrentFeesPaid > 0) {
        explanation = `Payment fully cleared previous arrears (KES ${roundedArrearsPaid.toLocaleString()}) and current billed fees (KES ${roundedCurrentFeesPaid.toLocaleString()}). The remaining surplus of KES ${overpaymentAmount.toLocaleString()} is recorded as advance fee credit.`;
      } else if (roundedArrearsPaid > 0) {
        explanation = `Payment fully cleared previous arrears (KES ${roundedArrearsPaid.toLocaleString()}). The remaining surplus of KES ${overpaymentAmount.toLocaleString()} is recorded as advance fee credit.`;
      } else if (roundedCurrentFeesPaid > 0) {
        explanation = `Payment fully cleared current billed fees (KES ${roundedCurrentFeesPaid.toLocaleString()}). The remaining surplus of KES ${overpaymentAmount.toLocaleString()} is recorded as advance fee credit.`;
      } else {
        explanation = `Learner has zero outstanding fee obligations. The full payment of KES ${overpaymentAmount.toLocaleString()} is recorded as advance fee credit.`;
      }
    } else if (isEligibleForOverpayment && overpaymentAmount === 0) {
      explanation = `Payment of KES ${paymentAmount.toLocaleString()} exactly cleared all outstanding obligations. Account balance is KES 0.00 with zero remainder.`;
    } else if (remainingArrears > 0) {
      explanation = `No overpayment credit eligible: KES ${remainingArrears.toLocaleString()} in previous-term arrears remains outstanding. Entire payment was allocated toward arrears.`;
    } else if (remainingCurrentFees > 0) {
      explanation = `No overpayment credit eligible: KES ${remainingCurrentFees.toLocaleString()} in current-term billed fees remains outstanding. Funds cleared arrears (KES ${roundedArrearsPaid.toLocaleString()}) and partially settled current fees (KES ${roundedCurrentFeesPaid.toLocaleString()}).`;
    }

    // Distribute allocations to specific invoices for audit and database tracking
    const invoiceAllocations: PaymentAllocationItem[] = [];
    const perInvoiceTotals = new Map<string, { invoice: StudentInvoice; totalPaid: number }>();

    let unallocatedArrears = roundedArrearsPaid;
    for (const item of obligations.arrearsItems) {
      if (unallocatedArrears <= 0) break;
      const portion = Math.min(unallocatedArrears, item.amount);
      if (portion > 0) {
        invoiceAllocations.push({
          invoiceId: item.invoice.id,
          invoiceNumber: item.invoice.invoiceNumber,
          amount: portion,
          type: 'ARREARS'
        });
        unallocatedArrears = Math.round((unallocatedArrears - portion) * 100) / 100;

        const curr = perInvoiceTotals.get(item.invoice.id) || { invoice: item.invoice, totalPaid: 0 };
        curr.totalPaid = Math.round((curr.totalPaid + portion) * 100) / 100;
        perInvoiceTotals.set(item.invoice.id, curr);
      }
    }

    let unallocatedCurrent = roundedCurrentFeesPaid;
    for (const item of obligations.currentTermItems) {
      if (unallocatedCurrent <= 0) break;
      const portion = Math.min(unallocatedCurrent, item.amount);
      if (portion > 0) {
        invoiceAllocations.push({
          invoiceId: item.invoice.id,
          invoiceNumber: item.invoice.invoiceNumber,
          amount: portion,
          type: 'CURRENT_TERM'
        });
        unallocatedCurrent = Math.round((unallocatedCurrent - portion) * 100) / 100;

        const curr = perInvoiceTotals.get(item.invoice.id) || { invoice: item.invoice, totalPaid: 0 };
        curr.totalPaid = Math.round((curr.totalPaid + portion) * 100) / 100;
        perInvoiceTotals.set(item.invoice.id, curr);
      }
    }

    return {
      paymentAmount,
      previousTermArrearsOutstanding: arrearsOutstanding,
      currentTermBilledFeesOutstanding: currentOutstanding,
      totalOutstandingBeforePayment: totalOutstandingBefore,
      arrearsPaid: roundedArrearsPaid,
      currentFeesPaid: roundedCurrentFeesPaid,
      overpaymentAmount,
      remainingArrears,
      remainingCurrentFees,
      totalOutstandingAfterPayment: totalOutstandingAfter,
      isEligibleForOverpayment,
      explanation,
      invoiceAllocations,
      perInvoiceTotals
    };
  }
}
