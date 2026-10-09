import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../main_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _idController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _idController.text = 'teacher.sarah';
    _passwordController.text = 'password123';

    _tabController.addListener(() {
      if (_tabController.indexIsChanging) return;
      if (_tabController.index == 0) {
        _idController.text = 'teacher.sarah';
      } else {
        _idController.text = 'parent.david';
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _idController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    final auth = context.read<AuthProvider>();
    final success = await auth.login(
      identifier: _idController.text.trim(),
      password: _passwordController.text.trim(),
    );

    if (success && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainShell()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFFF8F5F5),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Top Hero Banner (matches Web Frontend Header & Logo)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.only(top: 56, bottom: 36, left: 24, right: 24),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppTheme.primaryMaroonDark, AppTheme.primaryMaroon],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(32),
                  bottomRight: Radius.circular(32),
                ),
              ),
              child: Column(
                children: [
                  // School Crest / Logo
                  Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.15),
                          blurRadius: 14,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(8),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: Image.asset(
                        'assets/images/logo.png',
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.school,
                          size: 40,
                          color: AppTheme.primaryMaroon,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'SmartShule',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  // School Motto Pill (matches Web Motto)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.auto_awesome, color: Colors.amberAccent, size: 14),
                        SizedBox(width: 6),
                        Text(
                          '"The future Begins Here"',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontStyle: FontStyle.italic,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'CBC School Management & Learner Tracking',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),

            // Login Card Shell
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: Card(
                elevation: 2,
                shadowColor: AppTheme.primaryMaroonDark.withValues(alpha: 0.08),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                  side: const BorderSide(color: Color(0xFFF1C8CF)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(22),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Role Switcher Tab Bar
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8F5F5),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: TabBar(
                          controller: _tabController,
                          indicatorSize: TabBarIndicatorSize.tab,
                          dividerColor: Colors.transparent,
                          indicator: BoxDecoration(
                            color: AppTheme.primaryMaroon,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.primaryMaroon.withValues(alpha: 0.2),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          labelColor: Colors.white,
                          unselectedLabelColor: AppTheme.textMuted,
                          labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                          tabs: const [
                            Tab(
                              icon: Icon(Icons.co_present_rounded, size: 18),
                              text: 'Teacher Portal',
                            ),
                            Tab(
                              icon: Icon(Icons.family_restroom_rounded, size: 18),
                              text: 'Parent Portal',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 22),

                      // Form Fields
                      const Text(
                        'IDENTIFIER (EMAIL OR PHONE)',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textMuted,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _idController,
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.person_outline, size: 20),
                          hintText: _tabController.index == 0 ? 'teacher.sarah' : 'parent.david',
                        ),
                      ),
                      const SizedBox(height: 16),

                      const Text(
                        'PASSWORD',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textMuted,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.lock_outline, size: 20),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off : Icons.visibility,
                              size: 20,
                            ),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Error message if any
                      if (auth.errorMessage != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 14),
                          child: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF2F2),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFFECACA)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline, color: Color(0xFFB91C1C), size: 18),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    auth.errorMessage!,
                                    style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                      // Sign In Button
                      ElevatedButton(
                        onPressed: auth.isLoading ? null : _handleLogin,
                        child: auth.isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.login, size: 18),
                                  SizedBox(width: 8),
                                  Text('Sign In to Portal'),
                                ],
                              ),
                      ),
                      const SizedBox(height: 22),

                      // Quick Demo Access Section
                      Row(
                        children: [
                          const Expanded(child: Divider()),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            child: Text(
                              'QUICK DEMO ACCESS',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: Colors.grey.shade600,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          const Expanded(child: Divider()),
                        ],
                      ),
                      const SizedBox(height: 14),

                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppTheme.primaryMaroon,
                                side: const BorderSide(color: AppTheme.primaryMaroonBorder),
                                backgroundColor: AppTheme.primaryMaroonTint,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                              icon: const Icon(Icons.co_present, size: 16),
                              label: const Text('Demo Teacher', style: TextStyle(fontSize: 12)),
                              onPressed: () async {
                                final navigator = Navigator.of(context);
                                await auth.loginAsTeacherDemo();
                                if (mounted) {
                                  navigator.pushReplacement(
                                    MaterialPageRoute(builder: (_) => const MainShell()),
                                  );
                                }
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppTheme.primaryMaroon,
                                side: const BorderSide(color: AppTheme.primaryMaroonBorder),
                                backgroundColor: AppTheme.primaryMaroonTint,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                              icon: const Icon(Icons.family_restroom, size: 16),
                              label: const Text('Demo Parent', style: TextStyle(fontSize: 12)),
                              onPressed: () async {
                                final navigator = Navigator.of(context);
                                await auth.loginAsParentDemo();
                                if (mounted) {
                                  navigator.pushReplacement(
                                    MaterialPageRoute(builder: (_) => const MainShell()),
                                  );
                                }
                              },
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Footer note matching web
            Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: Text(
                'SmartShule CBC Portal • All institutional accounts managed via UI',
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey.shade600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
