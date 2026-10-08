import 'package:flutter/material.dart';

class DiscoverPlace {
  const DiscoverPlace({required this.title, required this.city});
  final String title;
  final String city;
}

class DiscoverList extends StatelessWidget {
  const DiscoverList({super.key, required this.places});

  final List<DiscoverPlace> places;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListView(
        children: [
          for (final place in places)
            ListTile(
              key: Key('place-${place.title}'),
              title: Text(place.title),
              subtitle: Text(place.city),
            ),
        ],
      ),
    );
  }
}

class SharedChecklist extends StatelessWidget {
  const SharedChecklist({super.key, required this.items, required this.onToggle});

  final List<({String id, String body, bool done})> items;
  final ValueChanged<String> onToggle;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListView(
        children: [
          for (final item in items)
            CheckboxListTile(
              key: Key('item-${item.id}'),
              value: item.done,
              title: Text(item.body),
              onChanged: (_) => onToggle(item.id),
            ),
        ],
      ),
    );
  }
}
