# Kế hoạch đa nền tảng

## Lựa chọn

Ứng dụng người dùng là một codebase Flutter cho iOS và Android. Web đồng hành dùng lại Dart ở pha 6, giới hạn ở lịch, album, story, notes và xem chat. API TypeScript đứng sau, hợp đồng là OpenAPI, client Dart sinh từ hợp đồng đó.

Flutter được chọn vì Lovebyte là sản phẩm điện thoại: chat, cào để mở tin, khóa máy, ảnh, push. Một cây widget giữ cùng hành vi trên hai store. Phần phải viết theo nền tảng nằm trong ít plugin, không nhân đôi màn hình.

React Native cũng làm được chat và push. Nó không được chọn vì hiệu ứng secret message và sổ Our Story sẽ lệ thuộc từng bridge UI. Kotlin Multiplatform hợp khi đã có team native hai phía. Repo này chưa có app native nào để kế thừa.

Web không phải bản đủ của app. Bản gốc là ứng dụng di động. Màn hình rộng hợp với album, lịch và story, không hợp để xin quyền vị trí.

## Ma trận

| Khả năng | iOS | Android | Web |
| --- | --- | --- | --- |
| OTP, ghép đôi, hồ sơ | Flutter | Flutter | Pha 6 |
| Chat, secret message, notes | Flutter | Flutter | Xem ở pha 6, soạn nếu socket dùng chung |
| Lịch, nhắc | Flutter, push | Flutter, push | Sửa lịch, không nhắc nền |
| Album, story, list | Flutter | Flutter | Flutter web |
| Discover | Flutter | Flutter | Có thể sau, không chặn di động |
| Khóa PIN / sinh trắc | Local auth | Local auth | Khóa lại phiên khi rời tab, không dùng vân tay máy tính ở bản đầu |
| Push | APNs | FCM | Không |
| Ảnh | Image picker, nén | Image picker, nén | Input file, nén trước khi PUT |
| Pin và vị trí | Pha 5, opt-in | Pha 5, opt-in | Không xin |
| Widget màn hình chính | Ngoài phạm vi | Ngoài phạm vi | Không |

## Phần không dùng chung

Những chỗ Flutter gọi API nền tảng, viết một interface trong `apps/mobile` và hai implementation:

- Push token và xin quyền thông báo.
- Secure storage cho PIN và refresh token.
- Local authentication.
- Chọn ảnh và quyền thư viện.
- Vị trí một lần khi người dùng đang ở màn hình trạng thái. Không dùng quyền “luôn luôn” ở bản đầu.

Widget, Live Activity, và nền luôn lấy vị trí không nằm trong cây widget chung. Nếu làm sau này thì là target native mỏng, đọc cùng API trạng thái, vẫn tuân thủ công tắc của người bị xem.

## iOS

- Tài khoản Apple Developer, App ID, APNs key.
- Quyền: thông báo, ảnh, Face ID. Quyền vị trí chỉ thêm ở pha 5, kèm mục đích viết rõ trong `Info.plist`, và chỉ hiện hộp thoại sau công tắc trong app.
- TestFlight cho staging, rồi App Store khi pha 2 ổn trên máy thật.
- iOS hạn chế việc giữ kết nối nền. Chat khi app đóng đi bằng push, không giữ WebSocket.

## Android

- Ứng dụng Firebase cho FCM, tách project staging và production.
- Target SDK theo yêu cầu Play hiện tại lúc nộp store.
- Quyền thông báo Android 13 trở lên xin trong app.
- Ảnh dùng photo picker. Vị trí pha 5 chỉ xin khi bật chia sẻ.
- Play internal testing trước, production sau cùng mốc với iOS.

## Web

- Cùng tài khoản, cùng refresh token, lưu trong bộ nhớ phiên trình duyệt. Không để refresh token trong local storage.
- Không đăng ký push trình duyệt trong phạm vi này.
- Layout rộng cho lịch và album. Chat trên web là một cột, không thiết kế lại sản phẩm thành ứng dụng desktop.
- Hostname web khác hostname API. Cookie nếu dùng thì `Secure`, `HttpOnly`, `SameSite`.

## Thiết kế một lần

- Token màu, chữ, khoảng cách trong ThemeData.
- Component: bong bóng chat, thẻ ngày, thẻ story, ô secret message.
- Ảnh bìa và sticker là asset riêng, không lấy từ app 2012.
- Chuỗi giao diện để trong file ARB. Bản đầu tiếng Việt và tiếng Anh. Thêm ngôn ngữ không đổi layout.

## Ngoại tuyến

- Điện thoại lưu hộp thư gần nhất, notes và lịch bằng cơ sở dữ liệu trên máy.
- Web không cần hộp ngoại tuyến đầy đủ. Mất mạng thì báo và giữ form đang gõ trong bộ nhớ trang.
- Hàng gửi tin chỉ bắt buộc trên điện thoại.

## Kiểm thử trên từng nền

- Mỗi pha di động chạy trên một máy iOS và một máy Android thật trước khi coi là xong. Simulator chỉ đủ cho layout.
- Pha 6 thêm trình duyệt điện thoại và trình duyệt desktop.
- Ma trận tối thiểu: cỡ chữ lớn của hệ điều hành, bàn phím đang mở ở màn chat, và từ chối quyền ảnh.

## Chuỗi phát hành

1. Hợp đồng OpenAPI và API local.
2. Android internal và iOS TestFlight trỏ staging.
3. Sửa lỗi hai máy thật cho tới hết pha 2.
4. Production di động. Cờ vị trí tắt.
5. Web staging, rồi web production ở pha 6.
6. Pha 5 nộp lại bản store kèm khai báo quyền vị trí.

Hai bản store dùng chung số phiên bản lấy từ git tag. Web phát hành riêng vì không chờ duyệt store.
