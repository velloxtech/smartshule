enum CBCRating {
  exceedingExpectations('EE', 'Exceeding Expectations', 4),
  meetingExpectations('ME', 'Meeting Expectations', 3),
  approachingExpectations('AE', 'Approaching Expectations', 2),
  belowExpectations('BE', 'Below Expectations', 1);

  final String code;
  final String label;
  final int points;
  const CBCRating(this.code, this.label, this.points);

  static CBCRating fromCode(String? code) {
    switch (code?.toUpperCase()) {
      case 'EE':
        return CBCRating.exceedingExpectations;
      case 'ME':
        return CBCRating.meetingExpectations;
      case 'AE':
        return CBCRating.approachingExpectations;
      case 'BE':
        return CBCRating.belowExpectations;
      default:
        return CBCRating.meetingExpectations;
    }
  }
}

class CBCAssessmentModel {
  final String id;
  final String learnerId;
  final String learnerName;
  final String learningArea; // e.g. Mathematics, Environmental, Literacy
  final String strand; // e.g. Numbers, Plants, Listening
  final String subStrand;
  final CBCRating rating;
  final String? remarks;
  final DateTime date;

  const CBCAssessmentModel({
    required this.id,
    required this.learnerId,
    required this.learnerName,
    required this.learningArea,
    required this.strand,
    required this.subStrand,
    required this.rating,
    this.remarks,
    required this.date,
  });

  factory CBCAssessmentModel.fromJson(Map<String, dynamic> json) {
    return CBCAssessmentModel(
      id: json['id']?.toString() ?? '',
      learnerId: json['learnerId']?.toString() ?? '',
      learnerName: json['learnerName']?.toString() ?? '',
      learningArea: json['learningArea']?.toString() ?? 'Mathematics',
      strand: json['strand']?.toString() ?? 'Numbers',
      subStrand: json['subStrand']?.toString() ?? 'Addition & Subtraction',
      rating: CBCRating.fromCode(
        json['rating']?.toString() ?? json['scoreCode']?.toString(),
      ),
      remarks: json['remarks']?.toString(),
      date: json['date'] != null
          ? DateTime.tryParse(json['date'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
