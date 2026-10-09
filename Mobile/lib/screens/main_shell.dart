import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';
import 'teacher/teacher_dashboard_screen.dart';
import 'teacher/teacher_attendance_screen.dart';
import 'teacher/teacher_assessment_screen.dart';
import 'teacher/teacher_announcements_screen.dart';
import 'parent/parent_dashboard_screen.dart';
import 'parent/parent_academics_screen.dart';
import 'parent/parent_fees_screen.dart';
import 'parent/parent_attendance_screen.dart';
import 'profile/profile_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isTeacher = auth.isTeacher;

    final teacherPages = const [
      TeacherDashboardScreen(),
      TeacherAttendanceScreen(),
      TeacherAssessmentScreen(),
      TeacherAnnouncementsScreen(),
      ProfileScreen(),
    ];

    final parentPages = const [
      ParentDashboardScreen(),
      ParentAcademicsScreen(),
      ParentFeesScreen(),
      ParentAttendanceScreen(),
      ProfileScreen(),
    ];

    final pages = isTeacher ? teacherPages : parentPages;

    // Guard against index out of range
    final activeIndex = _currentIndex < pages.length ? _currentIndex : 0;

    const activeColor = AppTheme.primaryMaroon;

    return Scaffold(
      body: IndexedStack(
        index: activeIndex,
        children: pages,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: activeIndex,
        onDestinationSelected: (index) {
          setState(() => _currentIndex = index);
        },
        indicatorColor: activeColor.withValues(alpha: 0.15),
        destinations: isTeacher ? _buildTeacherNavItems() : _buildParentNavItems(),
      ),
    );
  }

  List<NavigationDestination> _buildTeacherNavItems() {
    return const [
      NavigationDestination(
        icon: Icon(Icons.dashboard_outlined),
        selectedIcon: Icon(Icons.dashboard, color: AppTheme.primaryMaroon),
        label: 'Dashboard',
      ),
      NavigationDestination(
        icon: Icon(Icons.how_to_reg_outlined),
        selectedIcon: Icon(Icons.how_to_reg, color: AppTheme.primaryMaroon),
        label: 'Roll Call',
      ),
      NavigationDestination(
        icon: Icon(Icons.rate_review_outlined),
        selectedIcon: Icon(Icons.rate_review, color: AppTheme.primaryMaroon),
        label: 'CBC Rubric',
      ),
      NavigationDestination(
        icon: Icon(Icons.campaign_outlined),
        selectedIcon: Icon(Icons.campaign, color: AppTheme.primaryMaroon),
        label: 'Notices',
      ),
      NavigationDestination(
        icon: Icon(Icons.person_outline),
        selectedIcon: Icon(Icons.person, color: AppTheme.primaryMaroon),
        label: 'Account',
      ),
    ];
  }

  List<NavigationDestination> _buildParentNavItems() {
    return const [
      NavigationDestination(
        icon: Icon(Icons.home_outlined),
        selectedIcon: Icon(Icons.home, color: AppTheme.primaryMaroon),
        label: 'Home',
      ),
      NavigationDestination(
        icon: Icon(Icons.menu_book_outlined),
        selectedIcon: Icon(Icons.menu_book, color: AppTheme.primaryMaroon),
        label: 'CBC Progress',
      ),
      NavigationDestination(
        icon: Icon(Icons.account_balance_wallet_outlined),
        selectedIcon: Icon(Icons.account_balance_wallet, color: AppTheme.primaryMaroon),
        label: 'Fees & M-Pesa',
      ),
      NavigationDestination(
        icon: Icon(Icons.calendar_today_outlined),
        selectedIcon: Icon(Icons.calendar_today, color: AppTheme.primaryMaroon),
        label: 'Attendance',
      ),
      NavigationDestination(
        icon: Icon(Icons.person_outline),
        selectedIcon: Icon(Icons.person, color: AppTheme.primaryMaroon),
        label: 'Account',
      ),
    ];
  }
}
