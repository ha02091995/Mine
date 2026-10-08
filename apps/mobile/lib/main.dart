import 'package:flutter/material.dart';
import 'package:lovebyte/src/api.dart';
import 'package:lovebyte/src/app_state.dart';
import 'package:lovebyte/src/home_page.dart';
import 'package:lovebyte/src/lock.dart';
import 'package:lovebyte/src/lock_screen.dart';
import 'package:lovebyte/src/reminders.dart';

const apiBase = String.fromEnvironment('API_BASE', defaultValue: 'http://127.0.0.1:3000');

void main() {
  runApp(LovebyteApp(api: HttpLovebyteApi(apiBase)));
}

class LovebyteApp extends StatefulWidget {
  const LovebyteApp({
    super.key,
    required this.api,
    this.platform = 'mobile',
    this.pinStore,
    this.biometrics,
    this.reminders,
  });

  final LovebyteApi api;
  final String platform;
  final PinStore? pinStore;
  final Future<bool> Function()? biometrics;
  final ReminderScheduler? reminders;

  @override
  State<LovebyteApp> createState() => _LovebyteAppState();
}

class _LovebyteAppState extends State<LovebyteApp> with WidgetsBindingObserver {
  late final AppState state = AppState(widget.api, platform: widget.platform, reminders: widget.reminders);
  late final LockController lock = LockController(widget.pinStore ?? MemoryPinStore(), biometrics: widget.biometrics);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    lock.load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    state.dispose();
    lock.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState next) {
    if (next == AppLifecycleState.resumed) lock.onResume();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Lovebyte',
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFB84C65)), useMaterial3: true),
      home: AnimatedBuilder(
        animation: lock,
        builder: (context, _) {
          if (lock.locked) return LockScreen(lock: lock);
          return LovebyteHome(state: state, lock: lock);
        },
      ),
    );
  }
}
