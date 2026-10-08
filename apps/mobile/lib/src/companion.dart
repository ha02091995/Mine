import 'package:flutter/material.dart';

const companionWideWidth = 900.0;

bool companionIsWide(double width) => width >= companionWideWidth;

class CompanionBoard extends StatelessWidget {
  const CompanionBoard({
    super.key,
    required this.notes,
    required this.events,
    required this.albums,
    required this.story,
  });

  final List<String> notes;
  final List<String> events;
  final List<String> albums;
  final List<String> story;

  @override
  Widget build(BuildContext context) {
    final wide = companionIsWide(MediaQuery.sizeOf(context).width);
    final sections = [
      _Section(title: 'Ghi chú', lines: notes),
      _Section(title: 'Lịch', lines: events),
      _Section(title: 'Album', lines: albums),
      _Section(title: 'Story', lines: story),
    ];
    return Scaffold(
      body: wide
          ? Row(key: const Key('companion-wide'), children: [for (final section in sections) Expanded(child: section)])
          : ListView(key: const Key('companion-stacked'), children: sections),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.lines});

  final String title;
  final List<String> lines;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        for (final line in lines) Text(line),
      ],
    );
  }
}

class RefreshTokenStore {
  RefreshTokenStore({required this.web});

  final bool web;
  String? token;
  final List<String> sinks = [];

  Future<void> save(String value) async {
    token = value;
    sinks.add(web ? 'memory' : 'secure-storage');
  }
}

Future<void> enableLocation({
  required bool web,
  required Future<void> Function() requestWhileInUse,
}) async {
  if (web) return;
  await requestWhileInUse();
}
