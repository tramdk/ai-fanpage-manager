---
title: Fanpage AI Manager
emoji: 🤖
colorFrom: indigo
colorTo: blue
sdk: docker
pinned: false
---

# 🤖 Fanpage AI Manager

> **Nền tảng quản lý & tự động hóa nội dung Facebook Fanpage thông minh** — Tích hợp hệ sinh thái AI sinh văn bản (Gemini AI), tìm kiếm hình ảnh tự động, dựng video tự động (AutoReels), quản lý thư viện truyền thông CDN (Cloudinary), thiết kế chiến dịch trực quan bằng Node-Based Workflows và đồng bộ trạng thái thời gian thực qua Event Bus (Redis Streams).

---

## 📖 Tổng quan dự án

**Fanpage AI Manager** là một hệ thống full-stack chuyên nghiệp giúp doanh nghiệp và các cá nhân tối ưu hóa quy trình vận hành chuỗi Fanpage Facebook. Hệ thống giải phóng thời gian xây dựng nội dung bằng cách tự động hóa từ bước lên chiến lược, phác thảo bài viết, tìm kiếm hình ảnh liên quan, dựng Reels, phê duyệt bài viết, lập lịch đăng tự động cho tới báo cáo phân tích hiệu năng.

### 🎯 Vấn đề & Giải pháp

| Vấn đề | Giải pháp của Fanpage AI Manager |
| :--- | :--- |
| **Sản xuất video thủ công tốn kém** | Tích hợp công nghệ **AutoReels API** tự động chia phân cảnh, ghép giọng đọc AI (TTS) và nhạc nền (BGM) để tạo Reels tự động từ văn bản. |
| **Mất nhiều thời gian tạo bài viết** | Công nghệ **Gemini AI Copywriting** tự động lập dàn ý theo 3 cấu trúc chuyên sâu: Educational, Sales/Promo, và Storytelling. |
| **Quản lý đa kênh rời rạc** | Giao diện quản trị tập trung (Soft UI), phân luồng phân quyền và cấu hình an toàn cho nhiều Fanpage qua Facebook Graph API. |
| **Chuỗi chiến dịch phức tạp** | **AI Strategy Workflow Builder** cho phép thiết kế kịch bản tiếp thị trực quan dạng Node kéo thả, tự động liên kết tài nguyên. |
| **Lịch đăng bài không nhất quán** | **Engine Cron Job & Fast-Follow Sync** chạy ngầm, tự động đăng bài đúng khung giờ kèm bộ lọc xử lý "bù giờ" (catch-up) nếu hệ thống gián đoạn. |
| **Bảo mật thông tin tài khoản** | Mã hóa bất đối xứng AES toàn bộ Access Token của Fanpage kết hợp mã hóa một chiều Bcrypt cho mật khẩu người dùng. |

---

## ✨ Tính năng nổi bật (Premium Capabilities)

### 🎨 Ngôn ngữ thiết kế Soft UI (Dark Mode First)
- **Soft UI & Tactile Experience**: Giao diện mang hơi hướng Neumorphism/Soft UI tinh tế với chiều sâu thị giác và phản hồi xúc giác động khi tương tác.
- **Obsidian Dark Theme**: Tối ưu hóa giao diện tối để giảm mỏi mắt khi vận hành hệ thống trong thời gian dài.
- **Micro-Animations**: Hiệu ứng chuyển động mượt mà bằng CSS Hardware Acceleration giúp gia tăng trải nghiệm người dùng.

### 🗺️ AI Strategy Workflow Architect (Visual Node Builder)
- **Node-Based Editor**: Thiết kế chiến lược nội dung thông qua hệ thống sơ đồ tư duy kéo thả trực quan.
- **Loại node hỗ trợ**:
  - **Trigger Node**: Xác định khung giờ đăng bài, tần suất chiến dịch và chu kỳ chạy.
  - **AI Text Node**: Chỉ định cấu trúc bài viết, tông giọng (tone), từ khóa chủ đề và hướng dẫn chi tiết cho Gemini.
  - **AI Image Node**: Tự động hóa việc gom ảnh vệ tinh từ các kho ảnh miễn phí lớn.
  - **AI Video Node**: Thiết lập cấu hình dựng Reels bằng AutoReels (template, giọng nói đọc truyện, nhạc nền).
  - **Publish Node**: Chỉ định Fanpage đích và trạng thái lưu trữ hàng đợi.

### 🎞️ AutoReels & Event-Driven Short Video Engine
- **Scene-Splitting Parser**: Tự động phân tách nội dung bài viết thành các phân cảnh: Hook (Mở bài giữ chân), Body (Nội dung cốt lõi), Outro (Lời kêu gọi hành động CTA).
- **TTS & BGM Customization**: Hỗ trợ lựa chọn đa dạng giọng đọc AI truyền cảm (Edge TTS, v.v.) và hàng loạt thư viện âm nhạc nền phù hợp với từng định dạng nội dung.
- **Redis Event Bus Worker**: Lắng nghe và cập nhật tiến trình dựng video từ hàng đợi sự kiện ngầm thông qua Redis Streams.
- **Fast-Publish Catch-up**: Tự động đẩy bài viết lên Facebook ngay khi video dựng xong nếu lịch đăng quy định đã trôi qua.

### 📁 Media Library & Deduplication
- **Cloudinary Integration**: Tự động lưu trữ và tối ưu hóa tài nguyên hình ảnh/video qua Cloudinary CDN.
- **MD5 Hash Deduplication**: Tạo mã băm nội dung tập tin khi tải lên, ngăn chặn trùng lặp tài nguyên vật lý trong cơ sở dữ liệu để tối ưu hóa không gian lưu trữ và băng thông.

### 📅 Lập lịch thông minh & Catch-up Engine
- **Precision Scheduling**: Tự động hóa đăng tải nội dung theo múi giờ được chỉ định (`Asia/Ho_Chi_Minh` mặc định).
- **Missed Slot Catch-up**: Tự động kiểm tra và đăng bù các bài viết bị lỡ lịch do sự cố mất kết nối mạng hoặc tắt nguồn máy chủ.
- **Queue Reordering**: Thay đổi thứ tự ưu tiên của các bài viết trong hàng đợi bằng thao tác kéo thả mượt mà trên lưới dữ liệu.

### 📊 Quản trị viên & Phân quyền
- **Role-Based Security**: Phân quyền chi tiết giữa Quản trị viên hệ thống (Admin) và Người vận hành (User).
- **Account Controls**: Quản trị viên có quyền kích hoạt/vô hiệu hóa người dùng, reset mật khẩu tạm thời hoặc ép buộc người dùng đổi mật khẩu trong lần đăng nhập đầu tiên để bảo vệ an toàn hệ thống.

---

## 🏗️ Kiến trúc hệ thống

Dưới đây là sơ đồ kiến trúc tổng quan của dự án, mô tả cách Client giao tiếp với Express Server và các dịch vụ bên thứ ba:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  React 19 + TypeScript  ·  Vite 6  ·  TailwindCSS 4            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Dashboard │  │Campaign  │  │Workflow  │  │Media     │        │
│  │ View     │  │ Studio   │  │ Builder  │  │ Library  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                   ApiService Layer (centralized)                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / REST API
┌──────────────────────────▼──────────────────────────────────────┐
│                  SERVER (Node.js / Express)                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Route Layer (Thin)                      │    │
│  │  auth · users · ai · schedules · posts · admin · ...    │    │
│  └───────────────────────┬─────────────────────────────────┘    │
│                          │ delegates to                          │
│  ┌───────────────────────▼─────────────────────────────────┐    │
│  │                 Service Layer (Business Logic)           │    │
│  │  AuthService · AiService · FanpageService · CronService │    │
│  │  WorkflowEngine · AutoreelsService · MediaService       │    │
│  │  EmailService · FacebookService · OAuthService          │    │
│  └───────────────────────┬─────────────────────────────────┘    │
│                          │                                       │
│  ┌───────────────────────▼─────────────────────────────────┐    │
│  │              Infrastructure Layer                        │    │
│  │  Prisma ORM (PostgreSQL)  ·  Redis Streams (Event Bus)  │    │
│  │  Cloudinary CDN · node-cron · SMTP (Nodemailer)         │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### 1. Luồng xử lý AutoReels & Đồng bộ Event Bus

Quá trình sinh video ngắn được phân tách nhiệm vụ và xử lý bất đồng bộ để tránh nghẽn luồng HTTP của máy chủ:

```
[Client]                      [Manager API]                [Redis Event Bus]             [AutoReels Service]
   │                               │                               │                              │
   │─── Yêu cầu tạo Video ────────▶│                               │                              │
   │    (hoặc qua Workflow)        │─── Đăng ký Event ────────────▶│                              │
   │                               │    REEL_REQUESTED             │─── Chuyển tiếp Request ─────▶│
   │                               │                               │                              │ (Tiến hành dựng video,
   │                               │                               │                              │  ghép voice & nhạc nền)
   │                               │                               │◀── Gửi REEL_PROCESSING ──────│
   │                               │                               │                              │
   │                               │◀── Đọc tin nhắn bằng Worker ──│                              │
   │                               │    (Cập nhật VideoQueue DB)   │                              │
   │                               │                               │◀── Gửi REEL_COMPLETED ───────│
   │                               │                               │    (Kèm Link Tải Video)      │
   │                               │◀── Đọc tin nhắn hoàn tất ─────│                              │
   │                               │    (Cập nhật Post.imageUrl)   │                              │
   │                               │                               │                              │
   │                               │─── Tự động kiểm tra giờ ──────│                              │
   │                               │    (Đăng ngay nếu lỡ lịch)    │                              │
   │                               │                               │                              │
   │◀── Cập nhật trạng thái UI ────│                               │                              │
```

### 2. Sơ đồ xử lý tài nguyên hình ảnh (Image Discovery)

Hệ thống cung cấp luồng fallback thông minh khi tìm kiếm hình ảnh minh họa cho bài viết:

```
[Chủ đề bài viết]
       │
       ├── Có Từ khóa (Keywords từ Cấu hình)? ──▶ Sử dụng Keywords làm truy vấn tìm kiếm
       └── Không có từ khóa? ────────────────────▶ Sử dụng Tên Chủ đề làm truy vấn
       │
       ▼
 ┌───────────┐
 │ Ưu tiên 1 │  Unsplash API (Yêu cầu API Key) ──▶ Lỗi/Hết hạn?
 └─────┬─────┘                                            │
       │ Thành công                                       ▼
       │                                            ┌───────────┐
       ▼ Tải tệp tạm & Upload                       │ Ưu tiên 2 │  Pexels API (Yêu cầu API Key) ──▶ Lỗi?
 [Cloudinary CDN Url]                               └─────┬─────┘                                    │
       │                                                  │ Thành công                               ▼
       ▼ Trả về ứng dụng                                  │                                    ┌───────────┐
                                                          ▼ Tải tệp & Upload                   │ Ưu tiên 3 │  LoremFlickr (Không Key)
                                                    [Cloudinary CDN Url]                       └─────┬─────┘
                                                                                                     │ Thất bại?
                                                                                                     ▼
                                                                                               ┌───────────┐
                                                                                               │ Fallback  │  Picsum Photos (Ngẫu nhiên)
                                                                                               └─────┬─────┘
                                                                                                     │ Thành công
                                                                                                     ▼
                                                                                                [Picsum Url]
```

---

## 🛠️ Công nghệ cốt lõi

### Frontend Stack
- **React 19.0.0**: Xây dựng giao diện hướng thành phần hiệu năng cao.
- **Vite 6.2.0**: Máy chủ phát triển HMR siêu tốc và trình biên dịch đóng gói sản phẩm.
- **TailwindCSS 4.1.14**: Thiết kế giao diện ứng dụng nhanh, nhất quán và responsive.
- **React Router DOM 7.2.0**: Điều hướng ứng dụng SPA.
- **Lucide React 0.546.0**: Hệ thống icon vector tối giản, sắc nét.
- **Sonner**: Quản lý và hiển thị thông báo góc màn hình trực quan.

### Backend Stack
- **Node.js (Express 4.21.2)**: Xây dựng RESTful API ổn định.
- **TypeScript & tsx**: Biên dịch và chạy trực tiếp mã TypeScript mà không cần tạo file trung gian trong quá trình phát triển.
- **Redis (ioredis)**: Quản lý hàng đợi và đồng bộ hóa Redis Streams.
- **node-cron**: Công cụ cấu hình lập lịch tác vụ ngầm định kỳ.
- **Multer**: Xử lý tệp tin tải lên (Multipart Form-Data).
- **google-genai 1.29.0**: Tích hợp mô hình ngôn ngữ lớn Google Gemini AI.
- **Nodemailer**: Gửi email kích hoạt tài khoản và lấy lại mật khẩu qua máy chủ SMTP.
- **Cloudinary SDK**: Quản lý hình ảnh và video đám mây.

### Database Layer
- **PostgreSQL**: Cơ sở dữ liệu quan hệ lưu trữ dữ liệu người dùng, fanpage và bài viết.
- **Prisma ORM 6.19.3**: Công cụ truy vấn cơ sở dữ liệu an toàn kiểu dữ liệu (Type-safe SQL Client).

---

## 📂 Cấu trúc dự án

```
fanpage-ai-manager/
├── prisma/
│   └── schema.prisma             # Định nghĩa mô hình PostgreSQL (Prisma Schema)
├── public/
│   └── uploads/                  # Bộ nhớ lưu ảnh tạm thời cục bộ (Local fallback)
├── backend/                      # Máy chủ Express & Xử lý nghiệp vụ ngầm
│   ├── index.ts                  # Điểm khởi đầu: Quét Database, nạp cron jobs & chạy Worker
│   ├── app.ts                    # Cấu hình Express Middleware, Helmet, CORS & Routing
│   ├── config/                   # Quản lý cấu hình dịch vụ bên thứ ba
│   │   ├── prisma.ts             # Khởi tạo Prisma Client Singleton
│   │   └── cloudinary.ts         # Khởi tạo Cloudinary Uploader
│   ├── middleware/
│   │   └── auth.ts               # Bộ lọc phân quyền JWT (User / Admin)
│   ├── utils/
│   │   └── encryption.ts         # Mã hóa đối xứng AES-256 bảo vệ Access Token Facebook
│   ├── routes/                   # Router nhận HTTP Request
│   │   ├── auth.routes.ts        # Đăng ký, Đăng nhập, Yêu cầu và xác nhận Reset Password
│   │   ├── user.routes.ts        # Hồ sơ người dùng
│   │   ├── admin.routes.ts       # Quản trị tài khoản (Danh sách, khóa, reset mật khẩu)
│   │   ├── fanpage.routes.ts     # Quản lý fanpage và đăng bài trực tiếp
│   │   ├── fbapp.routes.ts       # Quản lý Facebook App đăng ký trong hệ thống
│   │   ├── oauth.routes.ts       # Nhận và xử lý OAuth Callback từ Facebook
│   │   ├── ai.routes.ts          # Tạo nội dung chữ (Gemini) và ảnh (Unsplash)
│   │   ├── schedule.routes.ts    # Lập lịch tự động
│   │   ├── post.routes.ts        # Quản lý hàng đợi, lịch sử, sắp xếp bài viết
│   │   ├── workflow.routes.ts    # Thiết lập, lưu và chạy quy trình chiến dịch tự động
│   │   ├── media.routes.ts       # Tải lên và truy vấn thư viện truyền thông
│   │   └── dashboard.routes.ts   # Tổng hợp dữ liệu phân tích hệ thống
│   └── services/                 # Tầng logic xử lý chính (Service Layer)
│       ├── auth.service.ts       # Nghiệp vụ tài khoản, phân quyền
│       ├── admin.service.ts      # Nghiệp vụ quản trị hệ thống
│       ├── fanpage.service.ts    # Đồng bộ thông tin trang từ Graph API
│       ├── fbapp.service.ts      # Liên kết Facebook App Bridge
│       ├── ai.service.ts         # Logic kết nối Gemini & Tìm kiếm ảnh đa nguồn
│       ├── schedule.service.ts   # Tạo và sửa đổi lịch đăng bài
│       ├── post.service.ts       # Quản lý hàng đợi bài đăng
│       ├── workflow.service.ts   # Workflow Engine điều hành các node chiến dịch
│       ├── autoreels.service.ts  # Ghép nối API AutoReels, chuyển văn bản thành Reels
│       ├── EventBusClient.ts     # Trình phát sự kiện lên Redis Streams
│       ├── eventBusWorker.ts     # Redis Worker ngầm lắng nghe trạng thái kết quả dựng Reels
│       ├── media.service.ts      # Xử lý tệp tin tải lên, mã hóa MD5 loại bỏ trùng lặp
│       ├── email.service.ts      # Tạo và gửi mail qua SMTP
│       ├── facebook.service.ts   # Kết nối trực tiếp Facebook Graph API đăng ảnh/video
│       ├── oauth.service.ts      # Trao đổi mã xác thực lấy Access Token dài hạn
│       └── cron.service.ts       # Lập lịch CronJob và đồng bộ trạng thái video hàng loạt
├── src/                          # React Frontend Source Code
│   ├── main.tsx                  # Điểm khởi tạo ứng dụng React
│   ├── App.tsx                   # Thiết lập Layout, Định tuyến SPA, Sidebar & Header
│   ├── index.css                 # File CSS chính định nghĩa Soft UI Design Tokens
│   ├── LanguageContext.tsx       # Cấu hình đa ngôn ngữ (VI/EN Context)
│   ├── translations.ts           # Kho từ điển dịch thuật
│   ├── types.ts                  # Tập hợp định nghĩa TypeScript Interfaces
│   ├── config.ts                 # Cài đặt cấu hình môi trường phía Client
│   ├── api/
│   │   └── index.ts              # Lớp trung gian ApiService giao tiếp REST API tập trung
│   ├── features/                 # Các module màn hình chức năng của hệ thống
│   │   ├── admin/                # Quản trị tài khoản người dùng
│   │   ├── ai-studio/            # Trình tạo bài viết thủ công & Theo dõi Video Queue
│   │   ├── approvals/            # Duyệt bài trước khi đưa vào hàng đợi đăng tải
│   │   ├── auth/                 # Đăng nhập, đổi mật khẩu bắt buộc, reset mật khẩu
│   │   ├── automation/           # Đặt lịch tự động
│   │   ├── dashboard/            # Bảng số liệu thống kê tổng hợp
│   │   ├── fanpages/             # Quản lý kết nối các trang Facebook
│   │   ├── history/              # Xem lịch sử đăng bài và log lỗi
│   │   ├── planner/              # Kế hoạch chiến dịch
│   │   ├── settings/             # Thiết lập tài khoản cá nhân & App Facebook Bridge
│   │   ├── strategy/             # Visual Builder thiết kế kịch bản Node-Based
│   │   └── studio/               # Studio lên kế hoạch nội dung hàng loạt
│   └── components/               # Các UI Components dùng chung
│       ├── ui/                   # Các thành phần giao diện cơ bản (Button, Input, Dialog...)
│       ├── MediaLibraryModal.tsx # Giao diện Thư viện đa phương tiện dùng chung
│       └── StatusBadge.tsx       # Nhãn hiển thị trạng thái tiêu chuẩn
└── docker-compose.yml            # Docker Compose chạy PostgreSQL & Redis nhanh
```

---

## ⚙️ Chi tiết mô hình dữ liệu (Prisma Schema)

| Tên Model | Mô tả nghiệp vụ | Các trường dữ liệu chính |
| :--- | :--- | :--- |
| **`User`** | Lưu trữ thông tin tài khoản người dùng trong hệ thống. | `id`, `email`, `password`, `role`, `isActive`, `requirePasswordChange`, `resetToken` |
| **`FacebookApp`** | Lưu thông tin ứng dụng Facebook (App ID + App Secret) làm cầu nối OAuth. | `id`, `appId`, `appSecret`, `name`, `userId` |
| **`Fanpage`** | Lưu các Fanpage đã liên kết của người dùng, chứa token Facebook được mã hóa. | `id`, `pageId`, `name`, `accessToken` (Mã hóa), `status`, `userId`, `facebookAppId` |
| **`Schedule`** | Cài đặt cấu hình lịch trình đăng bài tự động của người dùng cho từng trang. | `id`, `topic`, `time`, `advancedPrompt`, `runCount`, `status`, `fanpageId`, `workflowId` |
| **`Post`** | Các bài viết được tạo ra, lưu trữ trạng thái, đường dẫn ảnh/video và ID bài đăng Facebook sau khi thành công. | `id`, `topic`, `content`, `imageUrl` (chứa URL ảnh hoặc đường dẫn video), `status`, `fbPostId`, `videoId`, `scheduleId` |
| **`Topic`** | Lưu trữ chủ đề và các từ khóa liên quan phục vụ cho công tác gợi ý nội dung. | `id`, `name`, `keywords`, `userId` |
| **`Workflow`** | Lưu trữ cấu trúc sơ đồ chiến dịch Node-Based kéo thả dưới dạng chuỗi JSON. | `id`, `name`, `description`, `nodesData` (JSON String), `edgesData` (JSON String), `userId` |
| **`Media`** | Lưu trữ thư viện ảnh và video đã tải lên Cloudinary để tái sử dụng. | `id`, `name`, `url`, `hash` (MD5 độc bản), `size`, `type`, `userId` |
| **`VideoQueue`** | Hàng đợi quản lý tiến trình render video của AutoReels. | `id`, `postId`, `videoId`, `status` (`processing` / `ready` / `error`) |

---

## 🚀 Hướng dẫn cài đặt & Triển khai

### Điều kiện tiên quyết
- **Node.js** phiên bản 18.x trở lên.
- **Docker** và **Docker Compose** cài đặt sẵn trên máy.
- Tài khoản **Google AI Studio** để lấy mã `GEMINI_API_KEY`.
- Ứng dụng **Facebook Developer App** cấu hình quyền `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`.
- Tài khoản **Cloudinary** (để lưu trữ ảnh thư viện).
- Khóa truy cập **Unsplash** và **Pexels** (nếu muốn tự động lấy ảnh chất lượng cao).

### Bước 1: Tải dependencies
```bash
npm install
```

### Bước 2: Cài đặt biến môi trường
Tạo tệp `.env` tại thư mục gốc dự án dựa trên tệp `.env.example`:
```bash
cp .env.example .env
```

Điền đầy đủ thông tin chi tiết vào các biến sau:
```env
# === DATABASE & APP CONFIG ===
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/fanpage_ai_manager?schema=public"
PORT=3000
APP_URL="http://localhost:3000"
TIMEZONE="Asia/Ho_Chi_Minh"

# === REDIS & EVENT BUS ===
REDIS_URL="redis://localhost:6379"
EVENT_BUS_URL="http://localhost:4000"

# === GOOGLE GEMINI AI ===
GEMINI_API_KEY="your_gemini_api_key"

# === ROOT ADMIN SETUP ===
ADMIN_EMAIL="admin@floral.com"
ADMIN_PASSWORD="secure_admin_password"

# === CLOUDINARY CDN CONFIG ===
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# === STOCK PHOTO API KEYS ===
UNSPLASH_ACCESS_KEY="your_unsplash_access_key"
PEXELS_API_KEY="your_pexels_api_key"

# === AUTOREELS VIDEO INTEGRATION ===
AUTOREELS_URL="http://localhost:3003"
AUTOREELS_TOKEN="your_autoreels_api_token"

# === SMTP MAIL HOST (Nodemailer) ===
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE="false"
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"
```

### Bước 3: Khởi chạy PostgreSQL & Redis (Docker)
```bash
docker-compose up -d
```
Lệnh này sẽ khởi tạo cơ sở dữ liệu PostgreSQL chạy tại cổng `5433` và Redis chạy tại cổng `6379`.

### Bước 4: Đồng bộ cấu trúc Database
```bash
npx prisma db push
npx prisma generate
```

### Bước 5: Khởi động hệ thống (Development Mode)
```bash
npm run dev
```
Ứng dụng khách (React SPA) và máy chủ (Express Server) sẽ cùng khởi động tại địa chỉ: `http://localhost:3000`. Hệ thống sẽ tự động tạo tài khoản Admin gốc dựa trên các biến `ADMIN_EMAIL` và `ADMIN_PASSWORD` trong file `.env` ở lần khởi chạy đầu tiên.

### Bước 6: Build & Chạy chế độ Production
```bash
npm run build
npm start
```

---

## 🔐 Cơ chế bảo mật & Quy tắc nghiệp vụ

1. **Token Encryption**: Token Fanpage liên kết với Graph API luôn được mã hóa đối xứng AES-256 thông qua một khóa kết hợp với Email riêng biệt của người dùng trước khi ghi xuống PostgreSQL.
2. **Password Policy & Admin Actions**: 
   - Mật khẩu được mã hóa băm Bcrypt 10 rounds.
   - Khi Admin kích hoạt tùy chọn `requirePasswordChange` trên tài khoản, người dùng sẽ bị chặn ở mọi màn hình và buộc phải thực hiện cập nhật mật khẩu mới tại màn hình Force Password Change trước khi tiếp tục thao tác.
   - Mã token khôi phục mật khẩu gửi qua email có thời hạn hết hiệu lực là 1 giờ.
3. **Bandwidth Optimization**: File tải lên thư viện truyền thông bắt buộc đi qua hàm kiểm tra MD5 Hash. Nếu phát hiện tệp tin đã tồn tại trong thư viện của hệ thống, máy chủ sẽ lập tức hủy ghi file vật lý mới và trả về đường dẫn hiện hữu để giảm thiểu rác dữ liệu.
4. **Fast-Follow Video Delivery**: Nếu một video render hoàn tất muộn hơn thời gian đăng bài định sẵn của Schedule (ví dụ: do hàng đợi render quá dài), worker sẽ kích hoạt tiến trình đăng bài ngay lập tức để giảm độ trễ kế hoạch.

---

## 🌐 Danh sách API Endpoints

### 1. Xác thực tài khoản (Auth)
| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Đăng ký tài khoản người dùng mới. |
| `POST` | `/api/auth/login` | Đăng nhập hệ thống, trả về Token JWT và thông tin người dùng. |
| `POST` | `/api/auth/setup-password` | Đổi mật khẩu tài khoản lần đầu (sử dụng setup token). |
| `GET` | `/api/auth/me` | Truy vấn thông tin người dùng đang đăng nhập dựa vào Token JWT. |
| `GET` | `/api/auth/facebook/url` | Lấy URL đăng nhập OAuth Facebook được cấu hình qua App Bridge. |

### 2. Quản lý Trang (Fanpage)
| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/fanpages` | Danh sách các Fanpage Facebook đã kết nối thành công. |
| `PATCH` | `/api/fanpages/:id/token` | Cập nhật Access Token thủ công cho Fanpage. |
| `DELETE` | `/api/fanpages/:id` | Xóa kết nối Fanpage ra khỏi tài khoản hệ thống. |
| `POST` | `/api/facebook/post` | Đăng bài viết (ảnh/nhiều ảnh/video) trực tiếp lên Fanpage ngay lập tức. |

### 3. Trợ lý AI (AI Content Generator)
| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `POST` | `/api/ai/generate-text` | Gửi prompt yêu cầu Gemini AI sinh nội dung bài viết. |
| `POST` | `/api/ai/generate-image` | Tìm kiếm ảnh liên quan từ Internet (Unsplash -> Pexels -> LoremFlickr). |

### 4. Quy trình Tự động hóa (Workflows)
| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/workflows` | Lấy danh sách các Workflows của người dùng. |
| `GET` | `/api/workflows/:id` | Xem chi tiết cấu trúc Node-Based của Workflow. |
| `POST` | `/api/workflows` | Tạo mới hoặc cập nhật lưu trữ cấu trúc Workflow hiện có. |
| `POST` | `/api/workflows/:id/execute` | Chạy trực tiếp Workflow Engine (hỗ trợ gom cụm batch video gửi AutoReels). |

### 5. Hàng đợi & Lịch trình (Posts & Schedules)
| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/schedules` | Danh sách lịch đăng bài tự động hiện có. |
| `POST` | `/api/schedules` | Thiết lập lịch tự động mới cho Fanpage. |
| `PATCH` | `/api/schedules/:id/status` | Tạm ngưng (`suspended`) hoặc kích hoạt lại (`active`) lịch đăng bài. |
| `DELETE` | `/api/schedules/:id` | Xóa cấu hình lịch đăng bài. |
| `GET` | `/api/posts` | Lịch sử đăng bài (bao gồm bài thành công, bài thất bại và bài đang đợi). |
| `POST` | `/api/posts/queue` | Đẩy bài viết vào hàng đợi đăng tự động. |
| `POST` | `/api/posts/reorder` | Cập nhật lại chỉ mục sắp xếp (`orderIndex`) của hàng đợi bài đăng. |
| `PUT` | `/api/posts/:id` | Chỉnh sửa nội dung hoặc hình ảnh của bài viết đang ở hàng đợi. |

### 6. Thư viện truyền thông (Media Library)
| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/media-library` | Danh sách hình ảnh, video đã tải lên trong thư viện cá nhân. |
| `POST` | `/api/media-library/upload` | Tải lên tệp đa phương tiện mới (Có MD5 Hash kiểm tra trùng lặp). |

### 7. Quản trị hệ thống (Admin Control)
| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/admin/users` | Lấy danh sách người dùng trong hệ thống (chỉ Admin). |
| `PUT` | `/api/admin/users/:id/status` | Kích hoạt hoặc vô hiệu hóa tài khoản của người dùng. |
| `POST` | `/api/admin/users/:id/reset-password` | Tạo mật khẩu tạm thời mới cho người dùng. |
| `POST` | `/api/admin/users/:id/revoke` | Thu hồi toàn bộ quyền truy cập và token đăng nhập của tài khoản. |

---

## 🧪 Quy trình Kiểm thử & Phát triển

Dự án tích hợp bộ kiểm thử đơn vị và tích hợp nằm trong thư mục `backend/tests/`.

Chạy kiểm thử:
```bash
npm test
```

### Nội dung kiểm thử chính:
- **`ai-service.test.ts`**: Kiểm tra kết nối sinh văn bản với Gemini, luồng fallback tìm ảnh của Unsplash/Pexels và luồng tải lên Cloudinary.
- **Nguyên tắc phát triển**: Mọi tính năng mới hoặc chỉnh sửa mã nguồn nghiệp vụ phải vượt qua toàn bộ các bài kiểm tra tự động trước khi thực hiện pull request hoặc đóng gói ứng dụng.

---

## 📝 Bản quyền

Dự án phát triển dưới giấy phép **MIT License**. Bạn được toàn quyền sử dụng, sao chép, chỉnh sửa và phân phối sản phẩm này cho các mục đích thương mại và phi thương mại.
