import 'package:flutter/material.dart';
import '../../models/student.dart';
import '../../models/assessment.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

class TeacherAssessmentScreen extends StatefulWidget {
  const TeacherAssessmentScreen({super.key});

  @override
  State<TeacherAssessmentScreen> createState() => _TeacherAssessmentScreenState();
}

class _TeacherAssessmentScreenState extends State<TeacherAssessmentScreen> {
  final ApiService _apiService = ApiService();
  List<StudentModel> _learners = [];
  StudentModel? _selectedLearner;
  bool _loading = true;

  String _selectedLearningArea = 'Mathematics Activities';
  final TextEditingController _strandController = TextEditingController(text: 'Numbers');
  final TextEditingController _subStrandController = TextEditingController(text: 'Addition & Regrouping');
  final TextEditingController _remarksController = TextEditingController();
  CbcRating _selectedRating = CbcRating.meetingExpectations;

  final List<String> _learningAreas = [
    'Mathematics Activities',
    'English Language Activities',
    'Kiswahili Language Activities',
    'Environmental Activities',
    'CRE Activities',
    'Creative Arts & Sports',
  ];

  @override
  void initState() {
    super.initState();
    _loadLearners();
  }

  Future<void> _loadLearners() async {
    final list = await _apiService.getLearners(grade: 'Grade 3', stream: 'East');
    if (mounted) {
      setState(() {
        _learners = list;
        if (list.isNotEmpty) _selectedLearner = list.first;
        _loading = false;
      });
    }
  }

  @override
  void dispose() {
    _strandController.dispose();
    _subStrandController.dispose();
    _remarksController.dispose();
    super.dispose();
  }

  void _saveAssessment() async {
    if (_selectedLearner == null) return;

    final assessment = CbcAssessmentModel(
      id: 'asm_${DateTime.now().millisecondsSinceEpoch}',
      learnerId: _selectedLearner!.id,
      learnerName: _selectedLearner!.name,
      learningArea: _selectedLearningArea,
      strand: _strandController.text.trim(),
      subStrand: _subStrandController.text.trim(),
      rating: _selectedRating,
      remarks: _remarksController.text.trim(),
      date: DateTime.now(),
    );

    final ok = await _apiService.recordAssessment(assessment);
    if (ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Saved ${_selectedRating.code} assessment for ${_selectedLearner!.name}',
          ),
          backgroundColor: AppTheme.primaryMaroon,
        ),
      );
      _remarksController.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

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
            const Text('Record CBC Assessment'),
          ],
        ),
        backgroundColor: AppTheme.primaryMaroon,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Learner Selector Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Select Learner',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<StudentModel>(
                      value: _selectedLearner,
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.person),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      items: _learners.map((learner) {
                        return DropdownMenuItem(
                          value: learner,
                          child: Text('${learner.name} (${learner.admissionNumber})'),
                        );
                      }).toList(),
                      onChanged: (val) => setState(() => _selectedLearner = val),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Learning Area & Competencies
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Learning Area (Sub-theme)',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _selectedLearningArea,
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.book_outlined),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      items: _learningAreas
                          .map((a) => DropdownMenuItem(value: a, child: Text(a)))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedLearningArea = val);
                      },
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _strandController,
                      decoration: const InputDecoration(
                        labelText: 'Strand / Topic',
                        prefixIcon: Icon(Icons.category_outlined),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _subStrandController,
                      decoration: const InputDecoration(
                        labelText: 'Sub-strand / Specific Learning Outcome',
                        prefixIcon: Icon(Icons.tune),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Kenyan CBC 4-Tier Rubric
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'CBC Performance Level',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 12),
                    _buildRubricOption(
                      rating: CbcRating.exceedingExpectations,
                      title: 'Exceeding Expectations (EE)',
                      subtitle: 'Consistently demonstrates mastery & creative application',
                      color: const Color(0xFF15803D),
                    ),
                    const SizedBox(height: 8),
                    _buildRubricOption(
                      rating: CbcRating.meetingExpectations,
                      title: 'Meeting Expectations (ME)',
                      subtitle: 'Demonstrates expected competency with minimal guidance',
                      color: const Color(0xFF0284C7),
                    ),
                    const SizedBox(height: 8),
                    _buildRubricOption(
                      rating: CbcRating.approachingExpectations,
                      title: 'Approaching Expectations (AE)',
                      subtitle: 'Demonstrates partial competency, requires support',
                      color: const Color(0xFFB45309),
                    ),
                    const SizedBox(height: 8),
                    _buildRubricOption(
                      rating: CbcRating.belowExpectations,
                      title: 'Below Expectations (BE)',
                      subtitle: 'Struggles with fundamental concepts, requires remedial work',
                      color: const Color(0xFFB91C1C),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _remarksController,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Teacher Qualitative Remarks / Portfolio Evidence',
                        hintText: 'e.g. Explains calculation methods accurately to peers.',
                        alignLabelWithHint: true,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Save Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryMaroon,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                icon: const Icon(Icons.check),
                label: const Text('Save CBC Assessment', style: TextStyle(fontSize: 16)),
                onPressed: _saveAssessment,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRubricOption({
    required CbcRating rating,
    required String title,
    required String subtitle,
    required Color color,
  }) {
    final isSelected = _selectedRating == rating;

    return InkWell(
      onTap: () => setState(() => _selectedRating = rating),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.08) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? color : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  rating.code,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: isSelected ? color : AppTheme.textDark,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ),
            Radio<CbcRating>(
              value: rating,
              groupValue: _selectedRating,
              activeColor: color,
              onChanged: (val) {
                if (val != null) setState(() => _selectedRating = val);
              },
            ),
          ],
        ),
      ),
    );
  }
}
