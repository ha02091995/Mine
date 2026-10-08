import 'dart:typed_data';

import 'package:image/image.dart' as img;

Uint8List compressForUpload(Uint8List bytes, {int maxSide = 1280, int quality = 70}) {
  final decoded = img.decodeImage(bytes);
  if (decoded == null) {
    throw FormatException('not an image');
  }
  final longest = decoded.width > decoded.height ? decoded.width : decoded.height;
  final scaled = longest <= maxSide
      ? decoded
      : img.copyResize(
          decoded,
          width: decoded.width >= decoded.height ? maxSide : null,
          height: decoded.height > decoded.width ? maxSide : null,
        );
  return Uint8List.fromList(img.encodeJpg(scaled, quality: quality));
}
