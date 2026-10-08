import 'package:flutter/foundation.dart';
import 'package:lovebyte/src/api.dart';
import 'package:lovebyte/src/reminders.dart';

enum AppStep { destination, otp, pair, home }

class AppState extends ChangeNotifier {
  AppState(this.api, {this.platform = 'mobile', ReminderScheduler? reminders})
      : reminders = reminders ?? MemoryReminderScheduler();

  final LovebyteApi api;
  final String platform;
  final ReminderScheduler reminders;

  AppStep step = AppStep.destination;
  String destination = '';
  String? inviteCode;
  Session? session;
  Partnership? partnership;
  List<Note> notes = [];
  List<CoupleEvent> events = [];
  String? error;
  bool busy = false;

  Future<void> requestOtp(String value) async {
    await _run(() async {
      destination = value.trim();
      await api.requestOtp(destination);
      step = AppStep.otp;
    });
  }

  Future<void> verifyOtp(String code) async {
    await _run(() async {
      session = await api.createSession(destination: destination, code: code.trim(), platform: platform);
      partnership = await api.getPartnership(session!.accessToken);
      if (partnership != null) {
        notes = await api.listNotes(session!.accessToken);
        events = await api.listEvents(session!.accessToken);
      }
      step = partnership == null ? AppStep.pair : AppStep.home;
    });
  }

  Future<void> createInvite() async {
    await _run(() async {
      inviteCode = await api.createInvite(session!.accessToken);
    });
  }

  Future<void> acceptInvite(String code) async {
    await _run(() async {
      partnership = await api.acceptInvite(session!.accessToken, code.trim());
      step = AppStep.home;
    });
  }

  Future<void> saveStartedOn(String startedOn) async {
    await _run(() async {
      partnership = await api.updateStartedOn(session!.accessToken, startedOn.trim());
    });
  }

  Future<void> addNote(String body) async {
    await _run(() async {
      await api.createNote(session!.accessToken, body.trim());
      notes = await api.listNotes(session!.accessToken);
    });
  }

  Future<void> addEvent({required String title, required DateTime startsAt}) async {
    await _run(() async {
      final created = await api.createEvent(
        session!.accessToken,
        title: title.trim(),
        startsAt: startsAt,
        remindOffsetMinutes: 60,
      );
      await reminders.schedule(ScheduledReminder(created.id, created.title, startsAt.subtract(const Duration(hours: 1))));
      events = await api.listEvents(session!.accessToken);
    });
  }

  Future<void> refreshPartnership() async {
    await _run(() async {
      partnership = await api.getPartnership(session!.accessToken);
      if (partnership != null) step = AppStep.home;
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      await action();
    } catch (error) {
      this.error = error.toString();
    } finally {
      busy = false;
      notifyListeners();
    }
  }
}
