import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lovebyte/main.dart';
import 'package:lovebyte/src/api.dart';

class FakeApi implements LovebyteApi {
  String? destination;
  Partnership? partnership;

  @override
  Future<void> requestOtp(String destination) async {
    this.destination = destination;
  }

  @override
  Future<Session> createSession({
    required String destination,
    required String code,
    required String platform,
  }) async {
    if (code != '123456') throw ApiError(401, 'INVALID_OTP', 'Sai mã');
    return Session(accessToken: 'access', refreshToken: 'refresh', userId: 'user-1', displayName: 'ada');
  }

  @override
  Future<String> createInvite(String accessToken) async => 'ABCD2345';

  @override
  Future<Partnership> acceptInvite(String accessToken, String code) async {
    partnership = Partnership(id: 'pair-1', daysTogether: 1, memberNames: ['ada', 'bao']);
    return partnership!;
  }

  @override
  Future<Partnership?> getPartnership(String accessToken) async => partnership;
}

void main() {
  testWidgets('otp, invite code, and pairing', (tester) async {
    final api = FakeApi();
    await tester.pumpWidget(LovebyteApp(api: api));

    await tester.enterText(find.byKey(const Key('destination-field')), 'ada@example.com');
    await tester.tap(find.byKey(const Key('continue-button')));
    await tester.pumpAndSettle();
    expect(api.destination, 'ada@example.com');
    expect(find.byKey(const Key('otp-field')), findsOneWidget);

    await tester.enterText(find.byKey(const Key('otp-field')), '123456');
    await tester.tap(find.byKey(const Key('verify-button')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('create-invite')), findsOneWidget);

    await tester.tap(find.byKey(const Key('create-invite')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('invite-code')), findsOneWidget);
    expect(find.text('ABCD2345'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('partner-code')), 'ZXCV9876');
    await tester.tap(find.byKey(const Key('accept-invite')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('home-days')), findsOneWidget);
    expect(find.text('Đã bên nhau 1 ngày'), findsOneWidget);
  });
}
