# Kế hoạch triển khai

Các pha xếp theo phụ thuộc. Pha sau bắt đầu khi pha trước đạt tiêu chí xong. Chưa ước lượng theo ngày.

Cấu trúc repo khi bắt đầu viết mã, cùng chỗ với thư mục tài liệu này:

```text
apps/mobile/     Flutter, iOS và Android trước, web sau
apps/api/        Modular monolith
packages/openapi OpenAPI là hợp đồng
infra/           Compose local: Postgres, Redis, kho ảnh
docs/lovebyte/   Bộ tài liệu này
```

Local chạy API, Postgres, Redis và kho ảnh bằng một lệnh. Mobile trỏ vào API local.

## Pha 0 — hợp đồng và đăng nhập

Việc:

- OpenAPI cho auth, invite, partnership.
- Đăng ký OTP, phiên, thu hồi phiên.
- Tạo mã mời, chấp nhận, rời cặp.
- Luật một cặp active trong database.
- Flutter: màn hình nhập OTP, màn hình mã mời, màn hình chờ đối phương.

Xong khi hai máy tạo được một cặp và người thứ ba không đọc được `GET /partnership` của họ. Chạy lại test API này trên staging.

## Pha 1 — hồ sơ, ghi chú, lịch

Việc:

- Sửa ngày bắt đầu, hiện số ngày bên nhau.
- Notes đồng bộ hai chiều.
- Events, countdown, nhắc local cộng push khi tới giờ.
- Khóa PIN trên máy, hỏi lại khi đưa app ra foreground.

Xong khi một người tạo kỷ niệm, người kia thấy countdown, và thông báo tới đúng một thiết bị của người kia.

## Pha 2 — chat và tin bí mật

Việc:

- REST tin nhắn, WebSocket, đã xem, đang gõ.
- Hàng đợi gửi khi mất mạng và `client_msg_id`.
- Push không kèm nội dung.
- Bộ sticker miễn phí đóng gói trong app.
- Secret message chữ và ảnh, trạng thái đã mở.

Xong khi tắt mạng giữa chừng vẫn không mất tin sau khi có lại mạng, và mở secret message trên một máy thì máy kia thấy đã mở.

## Pha 3 — album và Our Story

Việc:

- Nén ảnh trên máy, upload bằng URL có chữ ký.
- Album, chú thích, xóa ảnh khỏi kho.
- Story chọn ảnh hoặc note làm mốc, sắp thứ tự.

Xong khi xóa ảnh làm URL cũ hết hiệu lực và object biến mất khỏi bucket. Story của cặp này không xuất hiện trong cặp khác.

## Pha 4 — danh sách và Discover

Việc:

- List và mục đánh dấu xong.
- Catalog Discover viết sẵn, lọc theo thành phố người dùng tự chọn.
- Lưu ý tưởng vào cặp.

Xong khi catalog đổi ở server mà không cần phát hành lại app. Không gọi định vị cho pha này.

## Pha 5 — pin, thời tiết, vị trí

Chỉ làm sau khi các pha trên đã có phân quyền cặp.

Việc:

- Công tắc pin và vị trí, mặc định tắt.
- `status_current` một dòng, xóa giá trị khi tắt.
- Màn hình đối phương hiện “đang tắt” khi không được chia sẻ.
- Thời tiết theo thành phố. Theo điểm vị trí chỉ lúc chia sẻ vị trí đang bật.
- Kiểm thử tay: tắt công tắc rồi gọi API trực tiếp vẫn không nhận được tọa độ cũ.

Xong khi không có bảng hay log nào giữ lịch sử tọa độ.

## Pha 6 — web đồng hành

Việc:

- Client web đăng nhập cùng tài khoản.
- Đọc và sửa lịch, album, story, notes.
- Chat đọc được. Soạn tin trên web có thể làm trong pha này nếu socket dùng lại được.
- Không xin vị trí trên web ở bản này.

Xong khi sửa một sự kiện trên web thì điện thoại thấy bản mới.

## Pha 7 — sticker thêm và xuất dữ liệu

Việc:

- Gói sticker tải sau, gắn entitlement. Chat cơ bản vẫn dùng bộ miễn phí.
- Xuất dữ liệu và xóa tài khoản từ trong app.
- E2E cho chat và secret message chỉ được thiết kế thành pha riêng sau khi web và nhiều thiết bị đã ổn. Không trộn vào pha 7 nếu chưa có thiết kế khóa.

## Kiểm thử theo lớp

- API: ghép đôi, từ chối người ngoài cặp, một user một cặp, tắt vị trí xóa tọa độ, tin trùng `client_msg_id`.
- Client: hàng đợi offline, khóa PIN khi resume, cào secret message.
- Hai máy thật ở pha 2: một Android, một iOS, nhắn qua staging.
- Ảnh: upload, xem, xóa, URL cũ không còn đọc được.

Dữ liệu staging là tài khoản giả. Không dùng ảnh hay hội thoại của người thật để test.

## Môi trường và phát hành

- Local: Compose.
- Staging: cùng dạng dịch vụ với production, hostname và bucket riêng. Build nội bộ cài từ TestFlight và Play internal trỏ staging.
- Production: bật khi pha 0 tới pha 2 đã đi qua hai máy thật trên staging.

Phát hành mobile theo cửa hàng. Web đồng hành chỉ lên production ở pha 6. Cờ `status` tắt trên production cho đến khi pha 5 qua kiểm thử tay.

## Vận hành tối thiểu

- Backup Postgres và thử restore trước production.
- Hàng xóa ảnh có metric tuổi của job cũ nhất.
- OTP và upload có hạn mức.
- Sự cố mất kho ảnh không được làm API auth chết. Upload trả lỗi riêng.

## Thứ tự không đảo

Không xây Discover, vị trí, hay web trước chat và ghép đôi. Không lưu lịch sử vị trí để “làm sau cho bản đồ”. Không lấy bộ sticker của app gốc.
