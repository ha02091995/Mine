import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lovebyte/src/companion.dart';

void main() {
  test('the web refresh store does not use localStorage', () async {
    final source = File('lib/src/companion.dart').readAsStringSync();
    expect(source, isNot(contains('localStorage')));
    final store = RefreshTokenStore(web: true);
    await store.save('refresh-token');
    expect(store.sinks, ['memory']);
    expect(store.token, 'refresh-token');
  });

  test('web does not ask for location permission', () async {
    var requests = 0;
    await enableLocation(web: true, requestWhileInUse: () async => requests += 1);
    expect(requests, 0);
    await enableLocation(web: false, requestWhileInUse: () async => requests += 1);
    expect(requests, 1);
  });

  testWidgets('a wide window shows notes, calendar, albums, and story together', (tester) async {
    tester.view.physicalSize = const Size(1200, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    await tester.pumpWidget(
      const MaterialApp(
        home: CompanionBoard(
          notes: ['nhớ mua hoa'],
          events: ['kỷ niệm'],
          albums: ['Hè'],
          story: ['ngày đầu'],
        ),
      ),
    );
    expect(find.byKey(const Key('companion-wide')), findsOneWidget);
    expect(find.text('nhớ mua hoa'), findsOneWidget);
    expect(find.text('kỷ niệm'), findsOneWidget);
    expect(find.text('Hè'), findsOneWidget);
    expect(find.text('ngày đầu'), findsOneWidget);
  });

  testWidgets('a narrow window stacks the same sections', (tester) async {
    tester.view.physicalSize = const Size(400, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    await tester.pumpWidget(
      const MaterialApp(
        home: CompanionBoard(notes: ['ghi chú'], events: ['lịch'], albums: ['album'], story: ['story']),
      ),
    );
    expect(find.byKey(const Key('companion-stacked')), findsOneWidget);
  });
}
