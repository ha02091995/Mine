# Phân tích nhu cầu

## Sản phẩm gốc

LoveByte (cách viết trên store: LoveByte) là ứng dụng cho người đang hẹn hò, đã đính hôn hoặc đã kết hôn. Công ty phát hành là LoveByte Pte. Ltd. Bản iOS ra ngày 27/07/2012. Năm 2014, bản 2.0 có trên iOS 6 trở lên trong khi Android vẫn là bản trước. Bản 3.0.3 cập nhật ngày 08/07/2016, hỗ trợ iOS 8 trở lên, có mua sticker trong ứng dụng.

Định vị của họ, lấy từ mô tả store và bài Yahoo Singapore ngày 14/08/2014:

- Messenger và sổ kỷ niệm số, chỉ hai người nhìn thấy.
- Nhắc cặp đôi đã bên nhau bao lâu và vì sao họ ở bên nhau.
- Không phải app làm quen người lạ.

Nguồn đối chiếu: mô tả store được Applion lưu lại, bài “Newly Revamped Couple App LoveByte” trên Yahoo Singapore, và các trang còn giữ mô tả bản 3.0.4. App gốc hiện không còn trên store.

## Việc người dùng cần app làm

| Việc | Biểu hiện trong LoveByte gốc |
| --- | --- |
| Có một chỗ chỉ của hai người | Ghép đôi, không feed công khai |
| Nhìn thấy câu chuyện của mình | Couple profile, số ngày bên nhau, Our Story |
| Nói chuyện riêng | Chat, sticker, emoticon |
| Gửi bất ngờ | Secret Message: chữ hoặc ảnh, cào màn hình để mở |
| Viết khi chưa muốn nói thẳng | Notes, thư ngắn, ý tưởng buổi hẹn |
| Không quên ngày | Dates, lịch chung, nhắc, countdown |
| Giữ ảnh | Album |
| Cùng làm việc nhỏ | Shared Lists |
| Có ý tưởng khi bí | Discover: ý tưởng hẹn hò, quà, câu trích, gợi ý theo khu vực |
| Biết đối phương đang thế nào | Vị trí, thời tiết, pin. Có công tắc bật tắt |
| Máy không bị bạn bè mở xem | Passcode lock |

## Người dùng

- Hai người đã có quan hệ, dùng app cùng nhau. Một người không tạo được “cặp” một mình.
- Người hay quên ngày kỷ niệm, sinh nhật, lịch hẹn.
- Người muốn chỗ riêng hơn mạng xã hội.
- Người ở hai thành phố, cần tin nhắn và mốc thời gian hơn là một mạng lưới bạn bè.

App không phục vụ nhóm bạn, gia đình đông người, hay người đang tìm đối tượng.

## Chức năng theo mức

P0 là bản đầu tiên vẫn đúng chất Lovebyte: hai người, hồ sơ cặp, tin nhắn, ngày quan trọng, khóa máy. P1 là sổ kỷ niệm. P2 là phần trang trí và trạng thái.

### P0 — không gian của hai người

- Đăng ký bằng email hoặc số điện thoại, xác thực một lần.
- Mời ghép đôi bằng mã hoặc QR. Người kia phải chấp nhận. Mỗi người một cặp đang hoạt động.
- Hủy ghép: đóng không gian chung, hai người không còn đọc dữ liệu của cặp đó.
- Hồ sơ cặp: tên hai người, ngày bắt đầu, đếm số ngày, ảnh đại diện.
- Chat 1-1: chữ, ảnh, sticker có sẵn. Đã xem, đang gõ.
- Notes: thư ngắn hai người cùng thấy.
- Dates: sự kiện, nhắc, countdown tới kỷ niệm và sinh nhật.
- Khóa ứng dụng bằng PIN hoặc sinh trắc học trên máy. Đây là khóa màn hình, không phải mã hóa đầu cuối.
- Xóa tài khoản và xóa dữ liệu cặp khi cả hai đã rời.

### P1 — sổ kỷ niệm

- Album và ảnh, có chú thích.
- Our Story: chọn ảnh hoặc note làm mốc, xem như một tuyến thời gian.
- Secret Message: chữ hoặc ảnh, người nhận cào để mở, có trạng thái đã mở.
- Danh sách chung: việc cần làm, đồ cần mua, ý tưởng.

### P2 — gợi ý và trạng thái

- Discover: danh mục ý tưởng hẹn hò, quà, câu nói. Lưu lại ý đã chọn. Gợi ý theo thành phố người dùng tự khai, không bắt buộc định vị.
- Sticker thêm, có thể bán sau. Lõi chat không bị khóa sau paywall.
- Trạng thái pin: phần trăm và lúc cập nhật, chỉ khi người đó bật chia sẻ pin.
- Thời tiết ở thành phố họ chọn, hoặc ở vị trí nếu họ đang chia sẻ vị trí.
- Vị trí hiện tại, chỉ khi người đó bật. Tắt thì đối phương thấy “đang tắt”, không xem được điểm cũ. Không có lịch sử đường đi.

## Phi chức năng

- Chỉ thành viên của cặp đọc được dữ liệu cặp đó.
- Ảnh và tin đi qua TLS. Ảnh lưu ngoài database, database chỉ giữ metadata.
- Chat mới tới trong vài giây khi cả hai đang mở app. Khi app đóng, dùng push.
- Đọc lại đoạn chat và lịch gần nhất khi mất mạng. Gửi tin xếp hàng, gửi lại khi có mạng.
- Máy ảnh lớn được thu nhỏ trước khi tải lên. Giới hạn dung lượng theo cặp để chi phí lưu trữ có trần.
- Vị trí không chạy ngầm để theo dõi. Cập nhật khi app đang mở, hoặc khi người dùng bật một chế độ cập nhật định kỳ và hệ điều hành đang hiện chỉ báo.
- Xóa tài khoản xóa ảnh, tin, ghi chú, lịch của người đó. Nếu người kia còn trong cặp, họ được xuất dữ liệu trước khi cặp đóng.
- Nhật ký tối thiểu: ai ghép, ai hủy, ai bật hoặc tắt chia sẻ vị trí. Không ghi nội dung tin nhắn vào log vận hành.

## Ngoài phạm vi bản xây lại

- Ghép người lạ, hồ sơ công khai, like, comment của người thứ ba.
- Nhóm chat, gia đình, nhiều cặp cùng lúc trên một tài khoản.
- Lịch sử vị trí, vùng địa lý, theo dõi khi đối phương không biết.
- Mã hóa đầu cuối ở bản đầu. Web và nhiều thiết bị làm quản lý khóa thành một dự án riêng. Bản đầu dùng TLS và phân quyền trên server. E2E là pha sau, chỉ cho chat và secret message.
- Ứng dụng desktop.
- Widget màn hình chính ở bản đầu. Pin và vị trí xem trong app trước.

## Rủi ro sản phẩm

- Chia sẻ vị trí và pin dễ bị hiểu là theo dõi. Công tắc phải nằm ở người bị xem, trạng thái bật phải hiện với cả hai, và không có chế độ ẩn.
- Sticker và nội dung Discover không được lấy nguyên bộ gốc. Cần bộ mới, có bản quyền rõ.
- Ảnh riêng tư đòi hỏi xóa thật trên kho đối tượng, không chỉ xóa dòng trong database.
- App Store và Play yêu cầu khai báo quyền vị trí, ảnh, thông báo. Quyền vị trí chỉ được xin ở màn hình trạng thái, sau khi người dùng bật chia sẻ.
