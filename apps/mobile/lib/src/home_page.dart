import 'package:flutter/material.dart';
import 'package:lovebyte/src/app_state.dart';

class LovebyteHome extends StatelessWidget {
  const LovebyteHome({super.key, required this.state});

  final AppState state;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: state,
      builder: (context, _) {
        return Scaffold(
          appBar: AppBar(title: const Text('Lovebyte')),
          body: SafeArea(
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                if (state.error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Text(state.error!, key: const Key('error-text'), style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  ),
                ...switch (state.step) {
                  AppStep.destination => [_DestinationForm(state: state)],
                  AppStep.otp => [_OtpForm(state: state)],
                  AppStep.pair => [_PairForm(state: state)],
                  AppStep.home => [_HomeBody(state: state)],
                },
              ],
            ),
          ),
        );
      },
    );
  }
}

class _DestinationForm extends StatefulWidget {
  const _DestinationForm({required this.state});
  final AppState state;

  @override
  State<_DestinationForm> createState() => _DestinationFormState();
}

class _DestinationFormState extends State<_DestinationForm> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Nhập email hoặc số điện thoại để nhận mã.'),
        const SizedBox(height: 16),
        TextField(
          key: const Key('destination-field'),
          controller: _controller,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(labelText: 'Email hoặc số điện thoại'),
        ),
        const SizedBox(height: 16),
        FilledButton(
          key: const Key('continue-button'),
          onPressed: widget.state.busy ? null : () => widget.state.requestOtp(_controller.text),
          child: const Text('Tiếp tục'),
        ),
      ],
    );
  }
}

class _OtpForm extends StatefulWidget {
  const _OtpForm({required this.state});
  final AppState state;

  @override
  State<_OtpForm> createState() => _OtpFormState();
}

class _OtpFormState extends State<_OtpForm> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Nhập mã gửi tới ${widget.state.destination}.'),
        const SizedBox(height: 16),
        TextField(
          key: const Key('otp-field'),
          controller: _controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Mã 6 số'),
        ),
        const SizedBox(height: 16),
        FilledButton(
          key: const Key('verify-button'),
          onPressed: widget.state.busy ? null : () => widget.state.verifyOtp(_controller.text),
          child: const Text('Vào app'),
        ),
      ],
    );
  }
}

class _PairForm extends StatefulWidget {
  const _PairForm({required this.state});
  final AppState state;

  @override
  State<_PairForm> createState() => _PairFormState();
}

class _PairFormState extends State<_PairForm> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final invite = widget.state.inviteCode;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Tạo mã mời, hoặc nhập mã của người kia.'),
        const SizedBox(height: 16),
        FilledButton(
          key: const Key('create-invite'),
          onPressed: widget.state.busy ? null : widget.state.createInvite,
          child: const Text('Tạo mã mời'),
        ),
        if (invite != null) ...[
          const SizedBox(height: 16),
          Text(invite, key: const Key('invite-code'), textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 8),
          OutlinedButton(
            key: const Key('refresh-partnership'),
            onPressed: widget.state.busy ? null : widget.state.refreshPartnership,
            child: const Text('Người kia đã nhập mã'),
          ),
        ],
        const SizedBox(height: 24),
        TextField(
          key: const Key('partner-code'),
          controller: _controller,
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(labelText: 'Mã của người kia'),
        ),
        const SizedBox(height: 16),
        FilledButton(
          key: const Key('accept-invite'),
          onPressed: widget.state.busy ? null : () => widget.state.acceptInvite(_controller.text),
          child: const Text('Ghép đôi'),
        ),
      ],
    );
  }
}

class _HomeBody extends StatelessWidget {
  const _HomeBody({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final partnership = state.partnership;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Đã bên nhau ${partnership?.daysTogether ?? 1} ngày',
          key: const Key('home-days'),
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        Text(partnership?.memberNames.join(' · ') ?? ''),
      ],
    );
  }
}
