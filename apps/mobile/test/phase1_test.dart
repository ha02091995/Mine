import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lovebyte/main.dart';
import 'package:lovebyte/src/api.dart';
import 'package:lovebyte/src/lock.dart';
import 'package:lovebyte/src/reminders.dart';

class Phase1Api implements LovebyteApi {
  final notes = <Note>[];
  final events = <CoupleEvent>[];
  Partnership partnership = Partnership(id: 'pair-1', daysTogether: 11, memberNames: ['ada', 'bao']);

  @override
  Future<void> requestOtp(String destination) async {}

  @override
  Future<Session> createSession({
    required String destination,
    required String code,
    required String platform,
  }) async {
    return Session(accessToken: 'access', refreshToken: 'refresh', userId: 'user-1', displayName: 'ada');
  }

  @override
  Future<String> createInvite(String accessToken) async => 'ABCD2345';

  @override
  Future<Partnership> acceptInvite(String accessToken, String code) async => partnership;

  @override
  Future<Partnership?> getPartnership(String accessToken) async => partnership;

  @override
  Future<Partnership> updateStartedOn(String accessToken, String startedOn) async => partnership;

  @override
  Future<List<Note>> listNotes(String accessToken) async => notes;

  @override
  Future<Note> createNote(String accessToken, String body) async {
    final note = Note(id: 'n1', body: body);
    notes.add(note);
    return note;
  }

  @override
  Future<List<CoupleEvent>> listEvents(String accessToken) async => events;

  @override
  Future<CoupleEvent> createEvent(
    String accessToken, {
    required String title,
    required DateTime startsAt,
    required int remindOffsetMinutes,
  }) async {
    final event = CoupleEvent(id: 'e1', title: title, countdownDays: 3);
    events.add(event);
    return event;
  }
}

void main() {
  testWidgets('pin locks on resume and a local reminder is scheduled', (tester) async {
    final api = Phase1Api();
    final reminders = MemoryReminderScheduler();
    await tester.pumpWidget(LovebyteApp(
      api: api,
      pinStore: MemoryPinStore(),
      biometrics: () async => true,
      reminders: reminders,
    ));

    await tester.enterText(find.byKey(const Key('destination-field')), 'ada@example.com');
    await tester.tap(find.byKey(const Key('continue-button')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('otp-field')), '123456');
    await tester.tap(find.byKey(const Key('verify-button')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('home-days')), findsOneWidget);

    await tester.ensureVisible(find.byKey(const Key('pin-field')));
    await tester.enterText(find.byKey(const Key('pin-field')), '1234');
    await tester.ensureVisible(find.byKey(const Key('save-pin')));
    await tester.tap(find.byKey(const Key('save-pin')));
    await tester.pumpAndSettle();

    final binding = tester.binding;
    binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump();
    expect(find.byKey(const Key('unlock-pin')), findsOneWidget);

    await tester.enterText(find.byKey(const Key('unlock-pin')), '0000');
    await tester.tap(find.byKey(const Key('unlock-button')));
    await tester.pump();
    expect(find.byKey(const Key('pin-error')), findsOneWidget);

    await tester.enterText(find.byKey(const Key('unlock-pin')), '1234');
    await tester.tap(find.byKey(const Key('unlock-button')));
    await tester.pump();
    expect(find.byKey(const Key('home-days')), findsOneWidget);

    await tester.ensureVisible(find.byKey(const Key('event-title')));
    await tester.enterText(find.byKey(const Key('event-title')), 'Kỷ niệm');
    await tester.ensureVisible(find.byKey(const Key('add-event')));
    await tester.tap(find.byKey(const Key('add-event')));
    await tester.pumpAndSettle();
    expect(reminders.items.single.title, 'Kỷ niệm');
    expect(find.textContaining('Kỷ niệm'), findsWidgets);
  });
}