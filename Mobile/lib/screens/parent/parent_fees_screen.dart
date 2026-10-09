import 'package:flutter/material.dart';
import '../../models/student.dart';
import '../../models/fee.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class ParentFeesScreen extends StatefulWidget {
  final StudentModel? student;
  const ParentFeesScreen({super.key, this.student});

  @override
  State<ParentFeesScreen> createState() => _ParentFeesScreenState();
}

class _ParentFeesScreenState extends State<ParentFeesScreen> {
  final ApiService _apiService = ApiService();
  double _balance = 7000.0;
  List<FeeInvoiceModel> _invoices = [];
  List<FeePaymentModel> _payments = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadFeeDetails();
  }

  Future<void> _loadFeeDetails() async {
    final learnerId = widget.student?.id ?? 'std_001';
    final data = await _apiService.getParentFees(learnerId);

    if (mounted) {
      setState(() {
        _balance = (data['totalBalance'] as num?)?.toDouble() ?? 7000.0;
        _invoices = (data['invoices'] as List?)?.cast<FeeInvoiceModel>() ?? [];
        _payments = (data['payments'] as List?)?.cast<FeePaymentModel>() ?? [];
        _loading = false;
      });
    }
  }

  void _showMpesaPaymentModal() {
    final amountController = TextEditingController(text: _balance.toStringAsFixed(0));
    final phoneController = TextEditingController(text: '0722334455');
    final admNumber = widget.student?.admissionNumber ?? 'ADM-2024-042';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          left: 20,
          right: 20,
          top: 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.green.shade100,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.phone_android, color: Colors.green, size: 24),
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'Lipa na M-Pesa Online',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(ctx).pop(),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: const [
                      Text('Paybill / Business No:', style: TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                      Text('247247 (SmartShule)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Account Number:', style: TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                      Text(admNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'M-Pesa Phone Number',
                prefixIcon: Icon(Icons.phone),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Amount (KES)',
                prefixIcon: Icon(Icons.payments_outlined),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryMaroon,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                icon: const Icon(Icons.send_to_mobile),
                label: const Text('Send STK Push Prompt', style: TextStyle(fontSize: 16)),
                onPressed: () {
                  Navigator.of(ctx).pop();
                  _simulateStkPush(amountController.text, phoneController.text);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _simulateStkPush(String amount, String phone) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.check_circle_outline, color: AppTheme.primaryMaroon, size: 48),
        title: const Text('M-Pesa STK Prompt Sent'),
        content: Text(
          'An M-Pesa prompt for KES $amount has been dispatched to $phone. Please enter your M-Pesa PIN on your phone to complete payment.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final learnerName = widget.student?.name ?? 'Liam Kiprono';

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 28,
              height: 28,
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(6),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: Image.asset(
                  'assets/images/logo.png',
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const Icon(Icons.school, size: 18, color: AppTheme.primaryMaroon),
                ),
              ),
            ),
            const SizedBox(width: 8),
            const Text('Fees & Payments'),
          ],
        ),
        backgroundColor: AppTheme.primaryMaroon,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Balance Card (School Maroon Theme)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.primaryMaroon, AppTheme.primaryMaroonDark],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primaryMaroon.withValues(alpha: 0.25),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Outstanding Balance • $learnerName',
                          style: const TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'KES ${_balance.toStringAsFixed(2)}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 30,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: AppTheme.primaryMaroon,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            icon: const Icon(Icons.payment, size: 20),
                            label: const Text('Lipa na M-Pesa', style: TextStyle(fontSize: 15)),
                            onPressed: _showMpesaPaymentModal,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Invoices
                  const Text(
                    'Fee Invoices',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  ..._invoices.map((inv) => Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    inv.invoiceNumber,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: inv.status == 'PAID'
                                          ? Colors.green.shade50
                                          : Colors.amber.shade50,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      inv.status,
                                      style: TextStyle(
                                        color: inv.status == 'PAID' ? Colors.green.shade800 : Colors.amber.shade900,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(inv.title, style: const TextStyle(fontSize: 13, color: AppTheme.textDark)),
                              const SizedBox(height: 10),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Billed: KES ${inv.totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                                  Text('Paid: KES ${inv.paidAmount.toStringAsFixed(0)}', style: const TextStyle(fontSize: 12, color: AppTheme.primaryMaroon, fontWeight: FontWeight.bold)),
                                  Text('Balance: KES ${inv.balance.toStringAsFixed(0)}', style: const TextStyle(fontSize: 12, color: Colors.redAccent, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      )),
                  const SizedBox(height: 20),

                  // Payment Receipts
                  const Text(
                    'Payment Receipts History',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  ..._payments.map((p) => Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.green.shade50,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.receipt_long, color: Color(0xFF10B981), size: 20),
                          ),
                          title: Text('KES ${p.amount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          subtitle: Text('${p.receiptNumber} • ${p.transactionCode ?? "MPESA"}'),
                          trailing: Text(
                            '${p.date.day}/${p.date.month}/${p.date.year}',
                            style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                          ),
                        ),
                      )),
                ],
              ),
            ),
    );
  }
}
