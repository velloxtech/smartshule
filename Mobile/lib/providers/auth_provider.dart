import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  UserModel? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;

  UserModel? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  bool get isTeacher => _currentUser?.role == UserRole.teacher;
  bool get isParent => _currentUser?.role == UserRole.parent || _currentUser?.role == UserRole.guardian;

  AuthProvider() {
    _loadSession();
  }

  Future<void> _loadSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userJson = prefs.getString('saved_user');
      if (userJson != null) {
        final decoded = jsonDecode(userJson);
        _currentUser = UserModel.fromJson(decoded, token: decoded['token']);
        _apiService.setAuthToken(_currentUser?.token);
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<bool> login({
    required String identifier,
    required String password,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final user = await _apiService.login(
        identifier: identifier,
        password: password,
      );
      _currentUser = user;
      _persistUser(user);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'Login failed: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> loginAsTeacherDemo() async {
    await login(identifier: 'teacher.sarah', password: 'password123');
  }

  Future<void> loginAsParentDemo() async {
    await login(identifier: 'parent.david', password: 'password123');
  }

  void switchRole(UserRole targetRole) {
    if (_currentUser == null) return;

    if (targetRole == UserRole.teacher) {
      _currentUser = const UserModel(
        id: 'teacher_001',
        firstName: 'Sarah',
        lastName: 'Wanjiku',
        email: 'teacher.sarah@smartshule.ac.ke',
        phone: '+254711223344',
        role: UserRole.teacher,
        schoolId: 'school_main',
        token: 'mock_jwt_teacher',
      );
    } else {
      _currentUser = const UserModel(
        id: 'parent_001',
        firstName: 'David',
        lastName: 'Kiprono',
        email: 'parent.david@smartshule.ac.ke',
        phone: '+254722334455',
        role: UserRole.parent,
        schoolId: 'school_main',
        token: 'mock_jwt_parent',
      );
    }
    _persistUser(_currentUser!);
    notifyListeners();
  }

  Future<void> _persistUser(UserModel user) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('saved_user', jsonEncode(user.toJson()));
    } catch (_) {}
  }

  Future<void> logout() async {
    _currentUser = null;
    _apiService.setAuthToken(null);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('saved_user');
    } catch (_) {}
    notifyListeners();
  }
}
