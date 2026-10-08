import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:lovebyte/src/images.dart';

void main() {
  test('compresses a photo before upload', () {
    final source = img.Image(width: 2000, height: 1500);
    img.fill(source, color: img.ColorRgb8(220, 40, 80));
    final png = Uint8List.fromList(img.encodePng(source));

    final jpeg = compressForUpload(png);
    final fullSize = Uint8List.fromList(img.encodeJpg(source, quality: 70));

    final decoded = img.decodeJpg(jpeg);
    expect(decoded, isNotNull);
    expect(decoded!.width, 1280);
    expect(decoded.height, 960);
    expect(jpeg.length, lessThan(fullSize.length));
  });
}
