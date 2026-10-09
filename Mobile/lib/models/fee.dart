class FeeInvoiceModel {
  final String id;
  final String invoiceNumber;
  final String title;
  final String term;
  final int academicYear;
  final double totalAmount;
  final double paidAmount;
  final double balance;
  final String status; // 'PAID', 'PARTIAL', 'UNPAID'
  final DateTime dueDate;

  const FeeInvoiceModel({
    required this.id,
    required this.invoiceNumber,
    required this.title,
    required this.term,
    required this.academicYear,
    required this.totalAmount,
    required this.paidAmount,
    required this.balance,
    required this.status,
    required this.dueDate,
  });

  factory FeeInvoiceModel.fromJson(Map<String, dynamic> json) {
    return FeeInvoiceModel(
      id: json['id']?.toString() ?? '',
      invoiceNumber: json['invoiceNumber']?.toString() ?? 'INV-001',
      title: json['title']?.toString() ?? 'Term 3 Tuition & Activities',
      term: json['term']?.toString() ?? 'Term 3',
      academicYear: int.tryParse(json['academicYear']?.toString() ?? '2026') ?? 2026,
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 25000.0,
      paidAmount: (json['paidAmount'] as num?)?.toDouble() ?? 18000.0,
      balance: (json['balance'] as num?)?.toDouble() ?? 7000.0,
      status: json['status']?.toString() ?? 'PARTIAL',
      dueDate: json['dueDate'] != null
          ? DateTime.tryParse(json['dueDate'].toString()) ?? DateTime(2026, 11, 15)
          : DateTime(2026, 11, 15),
    );
  }
}

class FeePaymentModel {
  final String id;
  final String receiptNumber;
  final double amount;
  final DateTime date;
  final String method;
  final String? transactionCode;

  const FeePaymentModel({
    required this.id,
    required this.receiptNumber,
    required this.amount,
    required this.date,
    required this.method,
    this.transactionCode,
  });

  factory FeePaymentModel.fromJson(Map<String, dynamic> json) {
    return FeePaymentModel(
      id: json['id']?.toString() ?? '',
      receiptNumber: json['receiptNumber']?.toString() ?? 'REC-001',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      date: json['date'] != null
          ? DateTime.tryParse(json['date'].toString()) ?? DateTime.now()
          : DateTime.now(),
      method: json['method']?.toString() ?? 'M-PESA',
      transactionCode: json['transactionCode']?.toString(),
    );
  }
}
