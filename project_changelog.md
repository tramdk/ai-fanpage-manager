# 🚀 Project Changelog: AI Fanpage Manager (Neural Edition)

Bản ghi các thay đổi lớn và tối ưu hóa hệ thống từ giai đoạn Planner đến giai đoạn Refactor chuẩn Vercel.

## 📅 Cập nhật mới nhất: Hệ thống AI Campaign Architect & Vercel Best Practices

### 🌟 Tính năng mới (New Features)
- **AI Campaign Architect Console:** Tích hợp Sidebar điều hành chiến dịch chuyên nghiệp (Topic, Audience, Strategy, Date Range).
- **Phễu nội dung AI (Hook-Narrative-Conversion):** Tự động tạo chuỗi bài viết có liên kết chặt chẽ theo logic marketing 3 giai đoạn.
- **Visual Journey Explorer (Strategy Map):** Bản đồ chiến dịch trực quan với khả năng cuộn ngang mượt mà.
- **Drag-and-Drop Reordering:** Hỗ trợ kéo thả các thẻ bài viết trên bản đồ để thay đổi thứ tự và tự động đồng bộ xuống Database.
- **Premium AI Creative Studio (Standalone):** Thành phần chỉnh sửa bài viết AI cao cấp, hỗ trợ gen lại văn bản và hình ảnh theo prompt riêng biệt.

### ⚡ Tối ưu hóa hiệu năng (Vercel React Best Practices)
- **Parallel Execution (async-parallel):** 
    - Khử hoàn toàn lỗi Waterfall trong Batch Generation (AutomationView), tăng tốc độ gen bài viết lên gấp 5 lần.
    - Tải dữ liệu Fanpage và Lịch trình song song khi khởi chạy ứng dụng.
    - Gen văn bản và hình ảnh đồng thời trong AI Creative Studio.
- **Render Stability (rerender-memo):** 
    - Memoize mọi card danh sách (`PostPreviewCard`) và Modal phức tạp (`QueueModal`, `AICreativeStudio`) để triệt tiêu re-render thừa.
    - Hoist các hằng số tĩnh (`navItems`) ra ngoài component scope.
- **Duy trì phản hồi Giao diện (rerender-transitions):**
    - Sử dụng `useTransition` (React 18) cho mọi hành động Tab-switching, giúp ứng dụng không bao giờ bị "freeze" khi nạp dữ liệu lớn.
- **Strict Rendering (rendering-conditional-render):**
    - Thay thế 100% toán tử `&&` bằng toán tử ba ngôi `? :` để tránh lỗi render giá trị rác (`0`, `false`).
- **Reference Integrity (rerender-functional-setstate & useCallback):**
    - Sử dụng `Functional setState` cho các cập nhật mảng phức tạp.
    - Bọc mọi Event Handler bằng `useCallback` để đảm bảo tính ổn định của component con.

### 🔧 Hạ tầng & Hệ thống (Infrastructure)
- **Media API Proxy:** Triển khai endpoint `/api/media/:filename` giúp truy cập ảnh vật lý (`public/uploads`) qua URL tuyệt đối ổn định.
- **Data Cascading Cleanup:** Tự động xóa sạch các bài viết liên quan khi xóa một chiến dịch (Schedule) để giữ Database sạch sẽ.
- **Standardized API Layer:** Đồng bộ hóa phương thức giao tiếp Backend qua `ApiService`.

---
*Ghi chú: Ứng dụng hiện tại đã đạt chuẩn kiến trúc React hiện đại, sẵn sàng cho việc mở rộng quy mô lớn.*
