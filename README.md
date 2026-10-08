# Mine

Repo này dùng để xây lại **Lovebyte**, ứng dụng riêng cho một cặp đôi.

LoveByte gốc do LoveByte Pte. Ltd. phát hành trên iOS ngày 27/07/2012, sau đó có Android. Bản 2.0 (2014) thêm lịch chung, danh sách chung, Our Story, đếm ngược, gợi ý hẹn hò, tin nhắn cào để mở, và trạng thái vị trí / thời tiết / pin. Bản 3.0 (cập nhật 3.0.3 ngày 08/07/2016) là messenger kèm sổ kỷ niệm: chat và sticker, tin bí mật, ghi chú, ngày kỷ niệm, album, dòng thời gian, và khóa mã PIN.

Tài liệu thiết kế nằm trong [`docs/lovebyte`](docs/lovebyte/README.md).

## Chạy local

```bash
bash scripts/up.sh
cd apps/api
cp .env.example .env
npx prisma migrate deploy
npm test
npm start
```

App Flutter:

```bash
cd apps/mobile
flutter test
flutter run --dart-define=API_BASE=http://127.0.0.1:3000
```

OTP local được in trong log API khi `OTP_LOG_CODE=true`.

| Tài liệu | Nội dung |
| --- | --- |
| [Phân tích nhu cầu](docs/lovebyte/01-phan-tich-nhu-cau.md) | Việc app phải làm, phạm vi, ưu tiên |
| [Thiết kế hệ thống](docs/lovebyte/02-thiet-ke-he-thong.md) | Kiến trúc, dữ liệu, API, quyền riêng tư |
| [Kế hoạch triển khai](docs/lovebyte/03-ke-hoach-trien-khai.md) | Các pha xây dựng và tiêu chí xong |
| [Đa nền tảng](docs/lovebyte/04-ke-hoach-da-nen-tang.md) | iOS, Android, web và phần phải viết native |
