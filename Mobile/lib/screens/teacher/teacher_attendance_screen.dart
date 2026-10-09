import 'package:flutter/material.dart';
import '../../models/student.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class TeacherAttendanceScreen extends StatefulWidget {
  const TeacherAttendanceScreen({super.key});

  @override
  State<TeacherAttendanceScreen> createState() => _TeacherAttendanceScreenState();
}

class _TeacherAttendanceScreenState extends State<TeacherAttendanceScreen> {
  final ApiService _apiService = ApiService();
  List<StudentModel> _learners = [];
  bool _loading = true;
  String _selectedGrade = 'Grade 3';
  String _selectedStream = 'East';

  @override
  void initState() {
    super.initState();
    _loadLearners();
  }

  Future<void> _loadLearners() async {
    setState(() => _loading = true);
    final data = await _apiService.getLearners(
      grade: _selectedGrade,
      stream: _selectedStream,
    );
    if (mounted) {
      setState(() {
        _learners = data;
        _loading = false;
      });
    }
  }

  void _updateStatus(int index, String newStatus) {
    setState(() {
      _learners[index] = _learners[index].copyWith(
        attendanceStatus: newStatus,
        checkInTime: newStatus == 'present' || newStatus == 'late'
            ? '${DateTime.now().hour.toString().padLeft(2, '0')}:${DateTime.now().minute.toString().padLeft(2, '0')} AM'
            : null,
      );
    });
  }

  void _markAllPresent() {
    setState(() {
      _learners = _learners
          .map((s) => s.copyWith(
                attendanceStatus: 'present',
                checkInTime: '07:45 AM',
              ))
          .toList();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('All learners marked Present'),
        duration: Duration(seconds: 1),
      ),
    );
  }

  void _submitAttendance() async {
    for (final learner in _learners) {
      await _apiService.markAttendance(
        studentId: learner.id,
        status: learner.attendanceStatus,
      );
    }

    if (mounted) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          icon: const Icon(Icons.check_circle, color: AppTheme.primaryMaroon, size: 48),
          title: const Text('Attendance Submitted'),
          content: Text(
            'Successfully recorded daily roll call for $_selectedGrade $_selectedStream (${_learners.length} learners). Parents have been notified.',
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
  }

  @override
  Widget build(BuildContext context) {
    final presentCount = _learners.where((s) => s.attendanceStatus == 'present').length;
    final absentCount = _learners.where((s) => s.attendanceStatus == 'absent').length;
    final lateCount = _learners.where((s) => s.attendanceStatus == 'late').length;

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
            const Text('Learner Roll Call'),
          ],
        ),
        backgroundColor: AppTheme.primaryMaroon,
        actions: [
          IconButton(
            icon: const Icon(Icons.playlist_add_check),
            tooltip: 'Mark All Present',
            onPressed: _markAllPresent,
          ),
        ],
      ),
      body: Column(
        children: [
          // Class & Date Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    DropdownButton<String>(
                      value: _selectedGrade,
                      underline: const SizedBox(),
                      items: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4']
                          .map((g) => DropdownMenuItem(value: g, child: Text(g, style: const TextStyle(fontWeight: FontWeight.bold))))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() => _selectedGrade = val);
                          _loadLearners();
                        }
                      },
                    ),
                    DropdownButton<String>(
                      value: _selectedStream,
                      underline: const SizedBox(),
                      items: ['East', 'West', 'North']
                          .map((s) => DropdownMenuItem(value: s, child: Text('Stream: $s', style: const TextStyle(fontWeight: FontWeight.bold))))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() => _selectedStream = val);
                          _loadLearners();
                        }
                      },
                    ),
                  ],
                ),
                const Divider(),
                // Counter summary badges
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _statusBadge('Present: $presentCount', AppTheme.primaryMaroon, AppTheme.primaryMaroonTint),
                    _statusBadge('Late: $lateCount', Colors.orange.shade800, Colors.orange.shade50),
                    _statusBadge('Absent: $absentCount', Colors.red.shade700, Colors.red.shade50),
                  ],
                ),
              ],
            ),
          ),

          // Learners List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _learners.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final learner = _learners[index];
                      return Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: AppTheme.primaryMaroon.withOpacity(0.1),
                                    foregroundColor: AppTheme.primaryMaroon,
                                    child: Text(
                                      learner.name.isNotEmpty ? learner.name[0] : '?',
                                      style: const TextStyle(fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          learner.name,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 15,
                                          ),
                                        ),
                                        Text(
                                          '${learner.admissionNumber} • Parent: ${learner.guardianName ?? "N/A"}',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: AppTheme.textMuted,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (learner.checkInTime != null)
                                    Text(
                                      learner.checkInTime!,
                                      style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              // Status selection chips
                              Row(
                                children: [
                                  _statusChoiceChip(index, 'present', 'Present', AppTheme.primaryMaroon),
                                  const SizedBox(width: 8),
                                  _statusChoiceChip(index, 'late', 'Late', Colors.orange.shade800),
                                  const SizedBox(width: 8),
                                  _statusChoiceChip(index, 'absent', 'Absent', Colors.red.shade700),
                                  const SizedBox(width: 8),
                                  _statusChoiceChip(index, 'excused', 'Excused', Colors.blueGrey),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),

          // Bottom Submit Bar
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryMaroon,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                icon: const Icon(Icons.cloud_upload_outlined),
                label: const Text('Save & Submit Roll Call', style: TextStyle(fontSize: 15)),
                onPressed: _submitAttendance,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusBadge(String text, Color textCol, Color bgCol) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bgCol,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: TextStyle(color: textCol, fontWeight: FontWeight.bold, fontSize: 12),
      ),
    );
  }

  Widget _statusChoiceChip(int index, String value, String label, Color color) {
    final isSelected = _learners[index].attendanceStatus == value;
    return InkWell(
      onTap: () => _updateStatus(index, value),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? color : color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? color : color.withOpacity(0.3),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : color,
          ),
        ),
      ),
    );
  }
}

