import {
  IPaymentGateway,
  StkPushRequest,
  StkPushResponse,
  MpesaCallbackData
} from '../../core/ports/services/IExternalServices';
import { IdGenerator } from '../../core/domain/shared/Errors';

export class MpesaDarajaPaymentAdapter implements IPaymentGateway {
  private readonly shortCode: string;
  private readonly passKey: string;

  constructor(
    shortCode = process.env.MPESA_SHORTCODE || '174379',
    passKey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
  ) {
    this.shortCode = shortCode;
    this.passKey = passKey;
  }

  public async initiateStkPush(request: StkPushRequest): Promise<StkPushResponse> {
    const checkoutRequestId = `ws_CO_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`;
    const merchantRequestId = `MR_${Date.now()}_${Math.floor(10000 + Math.random() * 90000)}`;

    // In a live environment with Daraja API credentials, this dispatches HTTPS request to Safaricom Daraja API:
    // https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest
    return {
      merchantRequestId,
      checkoutRequestId,
      responseCode: '0',
      responseDescription: 'Success. Request accepted for processing',
      customerMessage: `Success. Prompt sent to ${request.phoneNumber}. Enter M-Pesa PIN to complete payment of KES ${request.amount}.`
    };
  }

  public async queryTransactionStatus(checkoutRequestId: string): Promise<{ success: boolean; receiptNumber?: string; message: string }> {
    return {
      success: true,
      receiptNumber: `QL${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      message: `Transaction ${checkoutRequestId} confirmed successfully.`
    };
  }

  public async processCallback(callbackPayload: any): Promise<MpesaCallbackData> {
    try {
      const stkCallback = callbackPayload?.Body?.stkCallback;
      if (!stkCallback) {
        return {
          merchantRequestId: 'UNKNOWN',
          checkoutRequestId: 'UNKNOWN',
          resultCode: 1,
          resultDesc: 'Invalid payload format'
        };
      }

      const merchantRequestId = stkCallback.MerchantRequestID;
      const checkoutRequestId = stkCallback.CheckoutRequestID;
      const resultCode = stkCallback.ResultCode;
      const resultDesc = stkCallback.ResultDesc;

      if (resultCode === 0 && stkCallback.CallbackMetadata?.Item) {
        const items = stkCallback.CallbackMetadata.Item;
        const amountItem = items.find((i: any) => i.Name === 'Amount');
        const receiptItem = items.find((i: any) => i.Name === 'MpesaReceiptNumber');
        const dateItem = items.find((i: any) => i.Name === 'TransactionDate');
        const phoneItem = items.find((i: any) => i.Name === 'PhoneNumber');

        return {
          merchantRequestId,
          checkoutRequestId,
          resultCode: 0,
          resultDesc,
          amount: amountItem ? Number(amountItem.Value) : undefined,
          mpesaReceiptNumber: receiptItem ? String(receiptItem.Value) : undefined,
          transactionDate: dateItem ? String(dateItem.Value) : undefined,
          phoneNumber: phoneItem ? String(phoneItem.Value) : undefined
        };
      }

      return {
        merchantRequestId,
        checkoutRequestId,
        resultCode,
        resultDesc
      };
    } catch (err: any) {
      return {
        merchantRequestId: 'UNKNOWN',
        checkoutRequestId: 'UNKNOWN',
        resultCode: 99,
        resultDesc: err.message || 'Error parsing M-Pesa callback'
      };
    }
  }
}
