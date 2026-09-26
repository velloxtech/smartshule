import {
  IPaymentGateway,
  StkPushRequest,
  StkPushResponse,
  MpesaCallbackData
} from '../../core/ports/services/IExternalServices';
import { KcbBuniPaymentAdapter } from './KcbBuniPaymentAdapter';

/**
 * Legacy Adapter: All M-Pesa operations route directly to the KCB Buni API platform
 * (replacing Safaricom Daraja API with KCB Buni Paybill 522123 rails).
 */
export class MpesaDarajaPaymentAdapter implements IPaymentGateway {
  private readonly kcbAdapter: KcbBuniPaymentAdapter;

  constructor() {
    this.kcbAdapter = new KcbBuniPaymentAdapter();
  }

  public async initiateStkPush(request: StkPushRequest): Promise<StkPushResponse> {
    return this.kcbAdapter.initiateStkPush(request);
  }

  public async queryTransactionStatus(checkoutRequestId: string): Promise<{ success: boolean; receiptNumber?: string; message: string }> {
    return this.kcbAdapter.queryTransactionStatus(checkoutRequestId);
  }

  public async processCallback(callbackPayload: any): Promise<MpesaCallbackData> {
    const kcbData = await this.kcbAdapter.processCallback(callbackPayload);
    return {
      merchantRequestId: kcbData.merchantRequestId,
      checkoutRequestId: kcbData.checkoutRequestId,
      resultCode: kcbData.resultCode,
      resultDesc: kcbData.resultDesc,
      amount: kcbData.amount,
      mpesaReceiptNumber: kcbData.mpesaReceiptNumber,
      transactionDate: kcbData.transactionDate,
      phoneNumber: kcbData.phoneNumber
    };
  }
}
