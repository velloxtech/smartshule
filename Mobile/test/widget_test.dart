import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smartshule_mobile/main.dart';
import 'package:smartshule_mobile/providers/auth_provider.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('SmartShule app launches and displays Teacher and Parent portal tabs', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
        ],
        child: const SmartShuleApp(),
      ),
    );

    // Initial frame
    await tester.pumpAndSettle();

    // Verify SmartShule branding
    expect(find.text('SmartShule'), findsOneWidget);

    // Verify Teacher and Parent portal tabs
    expect(find.text('Teacher Portal'), findsOneWidget);
    expect(find.text('Parent Portal'), findsOneWidget);

    // Verify Demo buttons
    expect(find.text('Demo Teacher'), findsOneWidget);
    expect(find.text('Demo Parent'), findsOneWidget);
  });
}
