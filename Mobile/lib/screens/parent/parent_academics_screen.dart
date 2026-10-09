import 'package:flutter/material.dart';
import '../../models/student.dart';
import '../../models/assessment.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class ParentAcademicsScreen extends StatefulWidget {
  final StudentModel? student;
  const ParentAcademicsScreen({super.key, this.student});

  @override
  State<ParentAcademicsScreen> createState() => _ParentAcademicsScreenState();
}

class _ParentAcademicsScreenState extends State<ParentAcademicsScreen> {
  final ApiService _apiService = ApiService();
  List<CbcAssessmentModel> _assessments = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadAssessments();
  }

  Future<void> _loadAssessments() async {
    final learnerId = widget.student?.id ?? 'std_001';
    final data = await _apiService.getAssessmentsForLearner(learnerId);
    if (mounted) {
      setState(() {
        _assessments = data;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final learnerName = widget.student?.name ?? 'Liam Kiprono';
    final grade = widget.student?.grade ?? 'Grade 3';
    final stream = widget.student?.stream ?? 'East';

    return Scaffold(
      backgroundColor: const Color(0xFFF8F5F5),
      appBar: AppBar(
        title: Row(
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
            const Text('CBC Academic Progress'),
          ],
        ),
        backgroundColor: AppTheme.primaryMaroon,
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf),
            tooltip: 'Download Report Card',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Downloading Term 3 Report Card for $learnerName...'),
                  backgroundColor: AppTheme.primaryMaroon,
                ),
              );
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Learner Header
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryMaroonTint,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.primaryMaroonBorder),
                    ),
                    child: Row(
                      children: [
                        const CircleAvatar(
                          radius: 24,
                          backgroundColor: AppTheme.primaryMaroon,
                          child: Icon(Icons.school, color: Colors.white, size: 28),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                learnerName,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.textDark,
                                ),
                              ),
                              Text(
                                '$grade $stream • Admission: ${widget.student?.admissionNumber ?? "ADM-2024-042"}',
                                style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Curriculum: Competency-Based Curriculum (CBC)',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppTheme.primaryMaroon,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Rubric Legend
                  const Text(
                    'Kenyan CBC Performance Scale',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _legendChip('EE: Exceeding (4)', const Color(0xFF059669)),
                      _legendChip('ME: Meeting (3)', const Color(0xFF0284C7)),
                      _legendChip('AE: Approaching (2)', const Color(0xFFD97706)),
                      _legendChip('BE: Below (1)', const Color(0xFFDC2626)),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Assessments List
                  const Text(
                    'Formative & Summative Competency Records',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 12),

                  ..._assessments.map((a) {
                    final color = _getColorForRating(a.rating);
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    a.learningArea,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                      color: AppTheme.textDark,
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: color,
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    a.rating.code,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Strand: ${a.strand} • ${a.subStrand}',
                              style: const TextStyle(fontSize: 13, color: AppTheme.textMuted),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade50,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.grey.shade200),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.rate_review_outlined, size: 16, color: AppTheme.textMuted),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      a.remarks ?? 'Competency demonstrated satisfactorily.',
                                      style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Color(0xFF334155)),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
    );
  }

  Widget _legendChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }

  Color _getColorForRating(CbcRating r) {
    switch (r) {
      case CbcRating.exceedingExpectations:
        return const Color(0xFF15803D);
      case CbcRating.meetingExpectations:
        return const Color(0xFF0284C7);
      case CbcRating.approachingExpectations:
        return const Color(0xFFB45309);
      case CbcRating.belowExpectations:
        return const Color(0xFFB91C1C);
    }
  }
}
