enum UserRole {
  teacher,
  parent,
  guardian,
  student,
  admin;

  static UserRole fromString(String? val) {
    if (val == null) return UserRole.parent;
    final upper = val.toUpperCase();
    if (upper.contains('TEACHER')) return UserRole.teacher;
    if (upper.contains('PARENT')) return UserRole.parent;
    if (upper.contains('GUARDIAN')) return UserRole.guardian;
    if (upper.contains('STUDENT')) return UserRole.student;
    if (upper.contains('ADMIN')) return UserRole.admin;
    return UserRole.parent;
  }

  String get displayName {
    switch (this) {
      case UserRole.teacher:
        return 'Teacher / Educator';
      case UserRole.parent:
        return 'Parent';
      case UserRole.guardian:
        return 'Guardian';
      case UserRole.student:
        return 'Learner / Student';
      case UserRole.admin:
        return 'Administrator';
    }
  }
}

class UserModel {
  final String id;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;
  final UserRole role;
  final String? schoolId;
  final String? token;

  const UserModel({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
    required this.role,
    this.schoolId,
    this.token,
  });

  String get fullName => '$firstName $lastName'.trim();

  factory UserModel.fromJson(Map<String, dynamic> json, {String? token}) {
    final roleStr = json['role'] as String?;
    return UserModel(
      id: json['id']?.toString() ?? '',
      firstName: json['firstName']?.toString() ?? '',
      lastName: json['lastName']?.toString() ?? '',
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      role: UserRole.fromString(roleStr),
      schoolId: json['schoolId']?.toString(),
      token: token ?? json['token']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'phone': phone,
      'role': role.name.toUpperCase(),
      'schoolId': schoolId,
      'token': token,
    };
  }
}
