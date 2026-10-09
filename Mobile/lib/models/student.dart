class StudentModel {
  final String id;
  final String name;
  final String admissionNumber;
  final String grade;
  final String stream;
  final String? guardianName;
  final String? guardianPhone;
  final String attendanceStatus; // 'present', 'absent', 'late', 'excused'
  final String? checkInTime;

  const StudentModel({
    required this.id,
    required this.name,
    required this.admissionNumber,
    required this.grade,
    required this.stream,
    this.guardianName,
    this.guardianPhone,
    this.attendanceStatus = 'present',
    this.checkInTime,
  });

  StudentModel copyWith({
    String? attendanceStatus,
    String? checkInTime,
  }) {
    return StudentModel(
      id: id,
      name: name,
      admissionNumber: admissionNumber,
      grade: grade,
      stream: stream,
      guardianName: guardianName,
      guardianPhone: guardianPhone,
      attendanceStatus: attendanceStatus ?? this.attendanceStatus,
      checkInTime: checkInTime ?? this.checkInTime,
    );
  }

  factory StudentModel.fromJson(Map<String, dynamic> json) {
    return StudentModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '${json['firstName'] ?? ''} ${json['lastName'] ?? ''}'.trim(),
      admissionNumber: json['admissionNumber']?.toString() ?? '',
      grade: json['grade']?.toString() ?? 'Grade 3',
      stream: json['stream']?.toString() ?? 'East',
      guardianName: json['guardianName']?.toString(),
      guardianPhone: json['guardianPhone']?.toString(),
      attendanceStatus: json['attendanceStatus']?.toString() ?? 'present',
      checkInTime: json['checkInTime']?.toString(),
    );
  }
}
