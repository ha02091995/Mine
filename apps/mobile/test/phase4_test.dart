import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lovebyte/src/discover.dart';

void main() {
  test('the app does not depend on a location package', () {
    final pubspec = File('pubspec.yaml').readAsStringSync();
    expect(pubspec, isNot(contains('geolocator')));
    expect(pubspec, isNot(contains('location:')));
  });

  testWidgets('a catalog title from the server shows up without a new build', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: DiscoverList(
          places: [DiscoverPlace(title: 'Phố sách', city: 'Hà Nội')],
        ),
      ),
    );
    expect(find.text('Phố sách'), findsOneWidget);
    expect(find.text('Hà Nội'), findsOneWidget);
  });

  testWidgets('checking an item marks it done', (tester) async {
    var done = false;
    await tester.pumpWidget(
      MaterialApp(
        home: StatefulBuilder(
          builder: (context, setState) {
            return SharedChecklist(
              items: [(id: '1', body: 'mua hoa', done: done)],
              onToggle: (_) => setState(() => done = true),
            );
          },
        ),
      ),
    );
    await tester.tap(find.byKey(const Key('item-1')));
    await tester.pump();
    final tile = tester.widget<CheckboxListTile>(find.byType(CheckboxListTile));
    expect(tile.value, isTrue);
  });
}
