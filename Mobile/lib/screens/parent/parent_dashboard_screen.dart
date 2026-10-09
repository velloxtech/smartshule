import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../models/student.dart';
import '../../models/announcement.dart';
import '../../theme/app_theme.dart';
import 'parent_fees_screen.dart';
import 'parent_academics_screen.dart';
import 'parent_attendance_screen.dart';

class ParentDashboardScreen extends StatefulWidget {
  const ParentDashboardScreen({super.key});

  @override
  State<ParentDashboardScreen> createState() => _ParentDashboardScreenState();
}

class _ParentDashboardScreenState extends State<ParentDashboardScreen> {
  final ApiService _apiService = ApiService();
  List<StudentModel> _myChildren = [];
  StudentModel? _selectedChild;
  List<AnnouncementModel> _announcements = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final learners = await _apiService.getLearners();
    final notices = await _apiService.getAnnouncements();

    if (mounted) {
      setState(() {
        _myChildren = learners.take(2).toList();
        if (_myChildren.isNotEmpty) {
          _selectedChild = _myChildren.first;
        }
        _announcements = notices;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.currentUser;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F5F5),
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: Image.asset(
                  'assets/images/logo.png',
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const Icon(Icons.school, size: 20, color: AppTheme.primaryMaroon),
                ),
              ),
            ),
            const SizedBox(width: 10),
            const Text('SmartShule • Parent'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none),
            onPressed: () {},
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Academic Session & Motto Banner (Matches Web)
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryMaroonTint,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.primaryMaroonBorder),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircleAvatar(radius: 3, backgroundColor: AppTheme.primaryMaroon),
                        SizedBox(width: 6),
                        Text(
                          'Term 3 - 2026 • Active Session',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryMaroon,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: const Text(
                      '"The future Begins Here"',
                      style: TextStyle(
                        fontSize: 11,
                        fontStyle: FontStyle.italic,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primaryMaroon,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Welcome greeting
              Text(
                'Welcome, ${user?.firstName ?? "Parent"}!',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.textDark,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Monitor your child\'s learning and school activities',
                style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
              ),
              const SizedBox(height: 16),

              // Active Child Switcher (Matches Web Learner Profile Card)
              if (_myChildren.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.primaryMaroonBorder),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primaryMaroon.withValues(alpha: 0.05),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      const CircleAvatar(
                        backgroundColor: AppTheme.primaryMaroonTint,
                        child: Icon(Icons.school, color: AppTheme.primaryMaroon),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Viewing Enrolled Child',
                              style: TextStyle(fontSize: 11, color: AppTheme.textMuted, fontWeight: FontWeight.bold),
                            ),
                            DropdownButton<StudentModel>(
                              value: _selectedChild,
                              isDense: true,
                              underline: const SizedBox(),
                              items: _myChildren.map((c) {
                                return DropdownMenuItem(
                                  value: c,
                                  child: Text(
                                    '${c.name} (${c.grade} ${c.stream})',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) setState(() => _selectedChild = val);
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 20),

              // Today's Attendance Snapshot Card
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: const BoxDecoration(
                                  color: AppTheme.primaryMaroonTint,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.check, color: AppTheme.primaryMaroon, size: 20),
                              ),
                              const SizedBox(width: 12),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Today\'s Attendance',
                                    style: TextStyle(fontSize: 12, color: AppTheme.textMuted, fontWeight: FontWeight.w600),
                                  ),
                                  Text(
                                    _selectedChild?.attendanceStatus.toUpperCase() == 'PRESENT'
                                        ? 'Present in Class'
                                        : 'Not Marked Yet',
                                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryMaroonTint,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.primaryMaroonBorder),
                            ),
                            child: Text(
                              _selectedChild?.checkInTime ?? '07:42 AM',
                              style: const TextStyle(
                                color: AppTheme.primaryMaroon,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Divider(height: 1),
                      const SizedBox(height: 8),
                      InkWell(
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => ParentAttendanceScreen(student: _selectedChild),
                            ),
                          );
                        },
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'View Attendance Calendar & Logs',
                              style: TextStyle(fontSize: 13, color: AppTheme.primaryMaroon, fontWeight: FontWeight.bold),
                            ),
                            Icon(Icons.arrow_forward_ios, size: 12, color: AppTheme.primaryMaroon),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Fee Balance Card (School Maroon Gradient)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppTheme.primaryMaroonDark, AppTheme.primaryMaroon],
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
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Term 3 Fee Balance',
                          style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'Due Oct 20',
                            style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'KES 7,000.00',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: AppTheme.primaryMaroon,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            icon: const Icon(Icons.payment, size: 18),
                            label: const Text('Pay with M-Pesa'),
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => ParentFeesScreen(student: _selectedChild),
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: const BorderSide(color: Colors.white70),
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                          ),
                          child: const Text('Breakdown'),
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => ParentFeesScreen(student: _selectedChild),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Academic Performance Highlight Card (Matches Web Broadsheet)
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'CBC Academic Progress',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                          TextButton(
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => ParentAcademicsScreen(student: _selectedChild),
                                ),
                              );
                            },
                            child: const Text(
                              'Full Broadsheet >',
                              style: TextStyle(color: AppTheme.primaryMaroon, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      _buildSubjectRow('Mathematics Activities', 'Exceeding (EE)', const Color(0xFF15803D)),
                      const SizedBox(height: 10),
                      _buildSubjectRow('English Language Activities', 'Meeting (ME)', const Color(0xFF0284C7)),
                      const SizedBox(height: 10),
                      _buildSubjectRow('Environmental Activities', 'Meeting (ME)', const Color(0xFF0284C7)),
                      const SizedBox(height: 10),
                      _buildSubjectRow('Creative Arts & Sports', 'Exceeding (EE)', const Color(0xFF15803D)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // School Announcements (Live Backend)
              const Text(
                'School Circulars & Updates',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textDark),
              ),
              const SizedBox(height: 12),
              if (_loading)
                const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
              else
                ..._announcements.map((item) => Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  item.title,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                Text(
                                  '${item.date.day}/${item.date.month}',
                                  style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              item.content,
                              style: const TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.4),
                            ),
                          ],
                        ),
                      ),
                    )),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSubjectRow(String subject, String level, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(subject, style: const TextStyle(fontSize: 13, color: AppTheme.textDark)),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            level,
            style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }
}
