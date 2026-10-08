import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:lovebyte/src/stickers.dart';

void main() {
  test('the free pack stays in the app and the extra pack is downloaded later', () {
    final bundled = File('assets/stickers/free.json').readAsStringSync();
    final ids = ((jsonDecode(bundled) as List).cast<Map<String, dynamic>>()).map((item) => item['id']);
    expect(ids, containsAll(['heart', 'kiss', 'hug']));
    expect(bundled, isNot(contains('spark')));
    expect(File('pubspec.yaml').readAsStringSync(), isNot(contains('assets/stickers/extra.json')));

    expect(canSendSticker('heart', {}), isTrue);
    expect(canSendSticker('spark', {}), isFalse);
    expect(canSendSticker('spark', {'extra'}), isTrue);
  });
}
