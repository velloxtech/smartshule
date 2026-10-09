import 'package:flutter/material.dart';
import '../../models/student.dart';
import '../../theme/app_theme.dart';

class ParentAttendanceScreen extends StatefulWidget {
  final StudentModel? student;
  const ParentAttendanceScreen({super.key, this.student});

  @override
  State<ParentAttendanceScreen> createState() => _ParentAttendanceScreenState();
}

class _ParentAttendanceScreenState extends State<ParentAttendanceScreen> {
  final List<Map<String, dynamic>> _history = [
    {'date': 'Today (Oct 8)', 'status': 'present', 'time': '07:42 AM', 'note': 'On time'},
    {'date': 'Yesterday (Oct 7)', 'status': 'present', 'time': '07:38 AM', 'note': 'On time'},
    {'date': 'Monday (Oct 6)', 'status': 'late', 'time': '08:15 AM', 'note': 'Morning traffic'},
    {'date': 'Friday (Oct 3)', 'status': 'present', 'time': '07:44 AM', 'note': 'On time'},
    {'date': 'Thursday (Oct 2)', 'status': 'absent', 'time': '-', 'note': 'Medical appointment'},
    {'date': 'Wednesday (Oct 1)', 'status': 'present', 'time': '07:40 AM', 'note': 'On time'},
  ];

  void _showReportAbsenceDialog() {
    final reasonController = TextEditingController();
    String absenceType = 'Sick Leave';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Report Absence / Leave'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Reason Type', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: absenceType,
                items: ['Sick Leave', 'Medical Appointment', 'Family Emergency', 'Travel']
                    .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                    .toList(),
                onChanged: (val) {
                  if (val != null) setDialogState(() => absenceType = val);
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: reasonController,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Details / Note to Class Teacher',
                  hintText: 'e.g. Has mild fever, visiting clinic this morning.',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Absence notification sent to class teacher.'),
                    backgroundColor: AppTheme.primaryMaroon,
                  ),
                );
              },
              child: const Text('Submit Notice'),
            ),
          ],
        ),
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
            const Text('Learner Attendance'),
          ],
        ),
        backgroundColor: AppTheme.primaryMaroon,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_alert_outlined),
            tooltip: 'Report Absence',
            onPressed: _showReportAbsenceDialog,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Stats summary card
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Term 3 Attendance Summary • $learnerName',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _metricCol('28 Days', 'Present', const Color(0xFF059669)),
                        _metricCol('1 Day', 'Late', Colors.orange.shade800),
                        _metricCol('1 Day', 'Absent', Colors.red.shade700),
                        _metricCol('96.6%', 'Rate', AppTheme.primaryMaroon),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Report Absence Button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.primaryMaroon,
                  side: const BorderSide(color: AppTheme.primaryMaroon),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                icon: const Icon(Icons.edit_calendar),
                label: const Text('Notify School of Planned Absence'),
                onPressed: _showReportAbsenceDialog,
              ),
            ),
            const SizedBox(height: 24),

            // Daily Log History
            const Text(
              'Daily Check-In Log',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            ..._history.map((item) {
              final status = item['status'] as String;
              final isPresent = status == 'present';
              final isLate = status == 'late';

              final color = isPresent
                  ? const Color(0xFF059669)
                  : isLate
                      ? Colors.orange.shade800
                      : Colors.red.shade700;

              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isPresent
                          ? Icons.check
                          : isLate
                              ? Icons.alarm
                              : Icons.close,
                      color: color,
                      size: 20,
                    ),
                  ),
                  title: Text(item['date'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  subtitle: Text(item['note'], style: const TextStyle(fontSize: 12)),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        status.toUpperCase(),
                        style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                      if (item['time'] != '-')
                        Text(
                          item['time'],
                          style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                        ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _metricCol(String value, String label, Color color) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
      ],
    );
  }
}
