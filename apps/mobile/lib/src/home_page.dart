import 'package:flutter/material.dart';
import 'package:lovebyte/src/app_state.dart';
import 'package:lovebyte/src/lock.dart';

class LovebyteHome extends StatelessWidget {
  const LovebyteHome({super.key, required this.state, this.lock});

  final AppState state;
  final LockController? lock;

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
                  AppStep.home => [_HomeBody(state: state, lock: lock)],
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

class _HomeBody extends StatefulWidget {
  const _HomeBody({required this.state, this.lock});
  final AppState state;
  final LockController? lock;

  @override
  State<_HomeBody> createState() => _HomeBodyState();
}

class _HomeBodyState extends State<_HomeBody> {
  final _startedOn = TextEditingController();
  final _note = TextEditingController();
  final _eventTitle = TextEditingController();
  final _pin = TextEditingController();

  @override
  void dispose() {
    _startedOn.dispose();
    _note.dispose();
    _eventTitle.dispose();
    _pin.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final partnership = widget.state.partnership;
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
        const SizedBox(height: 16),
        TextField(
          key: const Key('started-on-field'),
          controller: _startedOn,
          decoration: const InputDecoration(labelText: 'Ngày bắt đầu YYYY-MM-DD'),
        ),
        const SizedBox(height: 8),
        OutlinedButton(
          key: const Key('save-started-on'),
          onPressed: widget.state.busy ? null : () => widget.state.saveStartedOn(_startedOn.text),
          child: const Text('Lưu ngày'),
        ),
        const SizedBox(height: 24),
        TextField(key: const Key('note-field'), controller: _note, decoration: const InputDecoration(labelText: 'Ghi chú')),
        const SizedBox(height: 8),
        FilledButton(
          key: const Key('add-note'),
          onPressed: widget.state.busy ? null : () => widget.state.addNote(_note.text),
          child: const Text('Thêm ghi chú'),
        ),
        for (final note in widget.state.notes) Text(note.body, key: Key('note-${note.id}')),
        const SizedBox(height: 24),
        TextField(key: const Key('event-title'), controller: _eventTitle, decoration: const InputDecoration(labelText: 'Sự kiện')),
        const SizedBox(height: 8),
        FilledButton(
          key: const Key('add-event'),
          onPressed: widget.state.busy
              ? null
              : () => widget.state.addEvent(title: _eventTitle.text, startsAt: DateTime.now().toUtc().add(const Duration(days: 3))),
          child: const Text('Thêm sự kiện'),
        ),
        for (final event in widget.state.events)
          Text('${event.title} · còn ${event.countdownDays} ngày', key: Key('event-${event.id}')),
        if (widget.lock != null) ...[
          const SizedBox(height: 24),
          TextField(
            key: const Key('pin-field'),
            controller: _pin,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Mã PIN'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            key: const Key('save-pin'),
            onPressed: () => widget.lock!.setPin(_pin.text),
            child: const Text('Đặt mã PIN'),
          ),
        ],
      ],
    );
  }
}
