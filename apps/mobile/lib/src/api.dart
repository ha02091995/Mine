import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiError implements Exception {
  ApiError(this.status, this.code, this.message);
  final int status;
  final String code;
  final String message;

  @override
  String toString() => message;
}

class Session {
  Session({required this.accessToken, required this.refreshToken, required this.userId, required this.displayName});
  final String accessToken;
  final String refreshToken;
  final String userId;
  final String displayName;
}

class Partnership {
  Partnership({required this.id, required this.daysTogether, required this.memberNames});
  final String id;
  final int daysTogether;
  final List<String> memberNames;

  factory Partnership.fromJson(Map<String, dynamic> json) {
    final members = (json['members'] as List).cast<Map<String, dynamic>>();
    return Partnership(
      id: json['id'] as String,
      daysTogether: json['daysTogether'] as int,
      memberNames: members.map((member) => member['displayName'] as String).toList(),
    );
  }
}

class Note {
  Note({required this.id, required this.body});
  final String id;
  final String body;

  factory Note.fromJson(Map<String, dynamic> json) {
    return Note(id: json['id'] as String, body: json['body'] as String);
  }
}

class CoupleEvent {
  CoupleEvent({required this.id, required this.title, required this.countdownDays});
  final String id;
  final String title;
  final int countdownDays;

  factory CoupleEvent.fromJson(Map<String, dynamic> json) {
    return CoupleEvent(
      id: json['id'] as String,
      title: json['title'] as String,
      countdownDays: json['countdownDays'] as int,
    );
  }
}

abstract class LovebyteApi {
  Future<void> requestOtp(String destination);
  Future<Session> createSession({required String destination, required String code, required String platform});
  Future<String> createInvite(String accessToken);
  Future<Partnership> acceptInvite(String accessToken, String code);
  Future<Partnership?> getPartnership(String accessToken);
  Future<Partnership> updateStartedOn(String accessToken, String startedOn);
  Future<List<Note>> listNotes(String accessToken);
  Future<Note> createNote(String accessToken, String body);
  Future<List<CoupleEvent>> listEvents(String accessToken);
  Future<CoupleEvent> createEvent(
    String accessToken, {
    required String title,
    required DateTime startsAt,
    required int remindOffsetMinutes,
  });
}

class HttpLovebyteApi implements LovebyteApi {
  HttpLovebyteApi(this.baseUrl, {http.Client? client}) : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  @override
  Future<void> requestOtp(String destination) {
    return _send('POST', '/v1/auth/otp', body: {'destination': destination});
  }

  @override
  Future<Session> createSession({
    required String destination,
    required String code,
    required String platform,
  }) async {
    final json = await _send('POST', '/v1/auth/sessions', body: {
      'destination': destination,
      'code': code,
      'device': {'platform': platform},
    });
    final user = json['user'] as Map<String, dynamic>;
    return Session(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      userId: user['id'] as String,
      displayName: user['displayName'] as String,
    );
  }

  @override
  Future<String> createInvite(String accessToken) async {
    final json = await _send('POST', '/v1/invites', token: accessToken);
    return json['code'] as String;
  }

  @override
  Future<Partnership> acceptInvite(String accessToken, String code) async {
    final json = await _send('POST', '/v1/invites/$code/accept', token: accessToken);
    return Partnership.fromJson(json);
  }

  @override
  Future<Partnership?> getPartnership(String accessToken) async {
    try {
      final json = await _send('GET', '/v1/partnership', token: accessToken);
      return Partnership.fromJson(json);
    } on ApiError catch (error) {
      if (error.status == 404) return null;
      rethrow;
    }
  }

  @override
  Future<Partnership> updateStartedOn(String accessToken, String startedOn) async {
    final json = await _send('PATCH', '/v1/partnership', token: accessToken, body: {'startedOn': startedOn});
    return Partnership.fromJson(json);
  }

  @override
  Future<List<Note>> listNotes(String accessToken) async {
    final json = await _sendList('/v1/notes', token: accessToken);
    return json.map(Note.fromJson).toList();
  }

  @override
  Future<Note> createNote(String accessToken, String body) async {
    final json = await _send('POST', '/v1/notes', token: accessToken, body: {'body': body});
    return Note.fromJson(json);
  }

  @override
  Future<List<CoupleEvent>> listEvents(String accessToken) async {
    final json = await _sendList('/v1/events', token: accessToken);
    return json.map(CoupleEvent.fromJson).toList();
  }

  @override
  Future<CoupleEvent> createEvent(
    String accessToken, {
    required String title,
    required DateTime startsAt,
    required int remindOffsetMinutes,
  }) async {
    final json = await _send('POST', '/v1/events', token: accessToken, body: {
      'title': title,
      'startsAt': startsAt.toUtc().toIso8601String(),
      'timezone': 'Asia/Ho_Chi_Minh',
      'kind': 'anniversary',
      'remindOffsetMinutes': remindOffsetMinutes,
    });
    return CoupleEvent.fromJson(json);
  }

  Future<Map<String, dynamic>> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
    String? token,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (token != null) headers['Authorization'] = 'Bearer $token';
    late http.Response response;
    switch (method) {
      case 'POST':
        response = await _client.post(uri, headers: headers, body: jsonEncode(body ?? {}));
      case 'PATCH':
        response = await _client.patch(uri, headers: headers, body: jsonEncode(body ?? {}));
      case 'GET':
        response = await _client.get(uri, headers: headers);
      default:
        throw ApiError(500, 'INTERNAL', 'Unsupported method');
    }
    final decoded = response.body.isEmpty ? <String, dynamic>{} : jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      throw ApiError(
        response.statusCode,
        (decoded['code'] as String?) ?? 'HTTP_ERROR',
        (decoded['message'] as String?) ?? 'Request failed',
      );
    }
    return decoded;
  }

  Future<List<Map<String, dynamic>>> _sendList(String path, {String? token}) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (token != null) headers['Authorization'] = 'Bearer $token';
    final response = await _client.get(uri, headers: headers);
    final decoded = response.body.isEmpty ? <dynamic>[] : jsonDecode(response.body) as List<dynamic>;
    if (response.statusCode >= 400) {
      throw ApiError(response.statusCode, 'HTTP_ERROR', 'Request failed');
    }
    return decoded.cast<Map<String, dynamic>>();
  }
}
