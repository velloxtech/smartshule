class AnnouncementModel {
  final String id;
  final String title;
  final String content;
  final String authorName;
  final String authorRole;
  final String category;
  final DateTime date;

  const AnnouncementModel({
    required this.id,
    required this.title,
    required this.content,
    required this.authorName,
    required this.authorRole,
    required this.category,
    required this.date,
  });

  factory AnnouncementModel.fromJson(Map<String, dynamic> json) {
    return AnnouncementModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Notice',
      content: json['content']?.toString() ?? '',
      authorName: json['authorName']?.toString() ?? 'Administration',
      authorRole: json['authorRole']?.toString() ?? 'SCHOOL_ADMIN',
      category: json['category']?.toString() ?? 'General',
      date: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
