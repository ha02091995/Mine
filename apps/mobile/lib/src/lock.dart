import 'package:flutter/foundation.dart';

abstract class PinStore {
  Future<String?> read();
  Future<void> write(String pin);
}

class MemoryPinStore implements PinStore {
  String? value;

  @override
  Future<String?> read() async => value;

  @override
  Future<void> write(String pin) async {
    value = pin;
  }
}

class LockController extends ChangeNotifier {
  LockController(this.store, {this.biometrics});

  final PinStore store;
  final Future<bool> Function()? biometrics;
  String? _pin;
  bool locked = false;
  String? error;

  bool get hasPin => _pin != null;

  Future<void> load() async {
    _pin = await store.read();
  }

  Future<void> setPin(String pin) async {
    await store.write(pin);
    _pin = pin;
    notifyListeners();
  }

  void onResume() {
    if (_pin != null) {
      locked = true;
      error = null;
      notifyListeners();
    }
  }

  bool unlock(String pin) {
    if (pin == _pin) {
      locked = false;
      error = null;
      notifyListeners();
      return true;
    }
    error = 'Sai mã PIN';
    notifyListeners();
    return false;
  }

  Future<bool> unlockWithBiometrics() async {
    if (biometrics == null) return false;
    final ok = await biometrics!();
    if (!ok) return false;
    locked = false;
    error = null;
    notifyListeners();
    return true;
  }
}
