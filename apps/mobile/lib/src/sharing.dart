import 'package:flutter/material.dart';

enum LocationConsent { whileInUse }

class LocationPermission {
  const LocationPermission({required this.request});

  final Future<bool> Function(LocationConsent consent) request;
}

class SharingController extends ChangeNotifier {
  SharingController(this.permission);

  final LocationPermission permission;
  bool locationOn = false;
  int whileInUseRequests = 0;

  Future<void> setLocation(bool enabled) async {
    if (!enabled) {
      locationOn = false;
      notifyListeners();
      return;
    }
    whileInUseRequests += 1;
    final granted = await permission.request(LocationConsent.whileInUse);
    locationOn = granted;
    notifyListeners();
  }
}

class PartnerLocationLine extends StatelessWidget {
  const PartnerLocationLine({super.key, required this.enabled});

  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Text(enabled ? 'Đang chia sẻ vị trí' : 'đang tắt', key: const Key('partner-location'));
  }
}
