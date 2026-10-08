import 'package:flutter/material.dart';
import 'package:lovebyte/src/lock.dart';

class LockScreen extends StatefulWidget {
  const LockScreen({super.key, required this.lock});

  final LockController lock;

  @override
  State<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends State<LockScreen> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Nhập mã PIN để mở Lovebyte'),
              const SizedBox(height: 16),
              TextField(
                key: const Key('unlock-pin'),
                controller: _controller,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'PIN'),
              ),
              if (widget.lock.error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(widget.lock.error!, key: const Key('pin-error')),
                ),
              const SizedBox(height: 16),
              FilledButton(
                key: const Key('unlock-button'),
                onPressed: () => widget.lock.unlock(_controller.text),
                child: const Text('Mở khóa'),
              ),
              if (widget.lock.biometrics != null)
                OutlinedButton(
                  key: const Key('biometric-button'),
                  onPressed: widget.lock.unlockWithBiometrics,
                  child: const Text('Dùng sinh trắc'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
