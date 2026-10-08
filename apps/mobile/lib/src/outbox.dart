class OutboundMessage {
  OutboundMessage({required this.clientMsgId, required this.body, this.stickerId});

  final String clientMsgId;
  final String body;
  String? stickerId;
  String? serverId;
}

class MessageOutbox {
  final items = <OutboundMessage>[];

  void add(OutboundMessage message) {
    items.add(message);
  }

  Future<void> flush(Future<String> Function(OutboundMessage message) send) async {
    for (final message in items) {
      if (message.serverId != null) continue;
      try {
        message.serverId = await send(message);
      } on DuplicateMessage catch (error) {
        message.serverId = error.serverId;
      }
    }
  }
}

class DuplicateMessage implements Exception {
  DuplicateMessage(this.serverId);
  final String serverId;
}
