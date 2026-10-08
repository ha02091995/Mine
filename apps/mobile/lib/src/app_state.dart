import 'package:flutter/foundation.dart';
import 'package:lovebyte/src/api.dart';

enum AppStep { destination, otp, pair, home }

class AppState extends ChangeNotifier {
  AppState(this.api, {this.platform = 'mobile'});

  final LovebyteApi api;
  final String platform;

  AppStep step = AppStep.destination;
  String destination = '';
  String? inviteCode;
  Session? session;
  Partnership? partnership;
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
