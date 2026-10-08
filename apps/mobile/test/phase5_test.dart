import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lovebyte/src/sharing.dart';

void main() {
  test('location permission is requested only after the switch is turned on', () async {
    final consents = <LocationConsent>[];
    final sharing = SharingController(
      LocationPermission(
        request: (consent) async {
          consents.add(consent);
          return true;
        },
      ),
    );

    await sharing.setLocation(false);
    expect(consents, isEmpty);
    expect(sharing.locationOn, isFalse);

    await sharing.setLocation(true);
    expect(consents, [LocationConsent.whileInUse]);
    expect(sharing.locationOn, isTrue);
    expect(consents, isNot(contains(isNot(LocationConsent.whileInUse))));
  });

  testWidgets('a partner who is not sharing is shown as off', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: PartnerLocationLine(enabled: false))));
    expect(find.text('đang tắt'), findsOneWidget);
  });
}
