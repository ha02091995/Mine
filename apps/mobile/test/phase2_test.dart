import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lovebyte/src/outbox.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('offline queue keeps a message and does not send it twice', () async {
    final outbox = MessageOutbox();
    outbox.add(OutboundMessage(clientMsgId: 'local-1', body: 'chào'));
    var attempts = 0;
    Future<String> send(OutboundMessage message) async {
      attempts += 1;
      if (attempts == 1) throw Exception('offline');
      if (attempts == 2) return 'server-1';
      throw Exception('sent again');
    }

    await expectLater(outbox.flush(send), throwsException);
    expect(outbox.items.single.serverId, isNull);

    await outbox.flush(send);
    expect(outbox.items.single.serverId, 'server-1');
    expect(attempts, 2);

    await outbox.flush(send);
    expect(attempts, 2);
  });

  test('a duplicate server id is kept after a retry', () async {
    final outbox = MessageOutbox();
    outbox.add(OutboundMessage(clientMsgId: 'local-2', body: 'lại'));
    await outbox.flush((message) async => throw DuplicateMessage('server-2'));
    expect(outbox.items.single.serverId, 'server-2');
  });

  test('free stickers are packaged in the app', () async {
    final raw = await rootBundle.loadString('assets/stickers/free.json');
    final stickers = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
    expect(stickers.map((sticker) => sticker['id']), containsAll(['heart', 'kiss', 'hug']));
  });
}