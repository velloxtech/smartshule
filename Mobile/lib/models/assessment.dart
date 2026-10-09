enum CbcRating {
  exceedingExpectations('EE', 'Exceeding Expectations', 4),
  meetingExpectations('ME', 'Meeting Expectations', 3),
  approachingExpectations('AE', 'Approaching Expectations', 2),
  belowExpectations('BE', 'Below Expectations', 1);

  final String code;
  final String label;
  final int points;
  const CbcRating(this.code, this.label, this.points);

  static CbcRating fromCode(String? code) {
    switch (code?.toUpperCase()) {
      case 'EE':
        return CbcRating.exceedingExpectations;
      case 'ME':
        return CbcRating.meetingExpectations;
      case 'AE':
        return CbcRating.approachingExpectations;
      case 'BE':
        return CbcRating.belowExpectations;
      default:
        return CbcRating.meetingExpectations;
    }
  }
}

class CbcAssessmentModel {
  final String id;
  final String learnerId;
  final String learnerName;
  final String learningArea; // e.g. Mathematics, Environmental, Literacy
  final String strand; // e.g. Numbers, Plants, Listening
  final String subStrand;
  final CbcRating rating;
  final String? remarks;
  final DateTime date;

  const CbcAssessmentModel({
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

  factory CbcAssessmentModel.fromJson(Map<String, dynamic> json) {
    return CbcAssessmentModel(
      id: json['id']?.toString() ?? '',
      learnerId: json['learnerId']?.toString() ?? '',
      learnerName: json['learnerName']?.toString() ?? '',
      learningArea: json['learningArea']?.toString() ?? 'Mathematics',
      strand: json['strand']?.toString() ?? 'Numbers',
      subStrand: json['subStrand']?.toString() ?? 'Addition & Subtraction',
      rating: CbcRating.fromCode(json['rating']?.toString() ?? json['scoreCode']?.toString()),
      remarks: json['remarks']?.toString(),
      date: json['date'] != null
          ? DateTime.tryParse(json['date'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
