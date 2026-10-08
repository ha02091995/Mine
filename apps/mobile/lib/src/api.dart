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

abstract class LovebyteApi {
  Future<void> requestOtp(String destination);
  Future<Session> createSession({required String destination, required String code, required String platform});
  Future<String> createInvite(String accessToken);
  Future<Partnership> acceptInvite(String accessToken, String code);
  Future<Partnership?> getPartnership(String accessToken);
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
}
