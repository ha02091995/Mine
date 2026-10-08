# Lovebyte

Bộ tài liệu để xây lại Lovebyte trên repo này.

1. [Phân tích nhu cầu](01-phan-tich-nhu-cau.md)
2. [Thiết kế hệ thống](02-thiet-ke-he-thong.md)
3. [Kế hoạch triển khai](03-ke-hoach-trien-khai.md)
4. [Kế hoạch đa nền tảng](04-ke-hoach-da-nen-tang.md)

Quyết định đã chốt trong bộ tài liệu:

- Một không gian cho đúng hai người đã ghép đôi. Không có bảng tin công khai và không ghép người lạ.
- Ứng dụng di động viết bằng Flutter. Web là bản đồng hành cho lịch, album và Our Story.
- API là một modular monolith, PostgreSQL, Redis, kho ảnh tương thích S3, WebSocket cho chat.
- Vị trí và pin chỉ hiện khi người đó tự bật. Tắt là xóa điểm cuối. Không lưu lịch sử di chuyển.
