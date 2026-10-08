import 'package:flutter/material.dart';
import 'package:lovebyte/src/api.dart';
import 'package:lovebyte/src/app_state.dart';
import 'package:lovebyte/src/home_page.dart';

const apiBase = String.fromEnvironment('API_BASE', defaultValue: 'http://127.0.0.1:3000');

void main() {
  runApp(LovebyteApp(api: HttpLovebyteApi(apiBase)));
}

class LovebyteApp extends StatefulWidget {
  const LovebyteApp({super.key, required this.api, this.platform = 'mobile'});

  final LovebyteApi api;
  final String platform;

  @override
  State<LovebyteApp> createState() => _LovebyteAppState();
}

class _LovebyteAppState extends State<LovebyteApp> {
  late final AppState state = AppState(widget.api, platform: widget.platform);

  @override
  void dispose() {
    state.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Lovebyte',
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFB84C65)), useMaterial3: true),
      home: LovebyteHome(state: state),
    );
  }
}
