# 🤖 Fanpage AI Manager

> **Nền tảng quản lý & tự động hóa nội dung Facebook Fanpage bằng AI** — đăng bài thông minh, lập lịch tự động, sinh nội dung & hình ảnh bằng Gemini AI.

---

## 📖 Tổng quan dự án

**Fanpage AI Manager** là một ứng dụng web full-stack giúp các cá nhân và doanh nghiệp quản lý nhiều Facebook Fanpage từ một giao diện duy nhất. Thay vì thủ công tạo nội dung và đăng bài, hệ thống tự động sinh bài viết chất lượng cao bằng Google Gemini AI, lên lịch đăng bài theo khung giờ tùy chỉnh, và theo dõi toàn bộ lịch sử hoạt động.

### 🎯 Mục tiêu nghiệp vụ

| Vấn đề                                         | Giải pháp                                                    |
|------------------------------------------------|--------------------------------------------------------------|
| Tốn thời gian tạo nội dung thủ công            | AI sinh content + ảnh tự động theo chủ đề                   |
| Khó quản lý nhiều Fanpage cùng lúc             | Dashboard tập trung, kết nối đa Fanpage qua Facebook API     |
| Thiếu nhất quán trong lịch đăng bài            | Hệ thống lập lịch (Cron Job) tự động hóa theo giờ cố định   |
| Không có chiến lược nội dung dài hạn           | AI Campaign Architect tạo chuỗi bài theo phễu marketing       |
| Rủi ro bảo mật khi quản lý nhiều token         | Multi-tenant, mỗi user quản lý token của riêng mình         |

---

## ✨ Tính năng chính

### 🏠 Dashboard
- Tổng quan số liệu: tổng Fanpage, lịch trình đang hoạt động, bài đã đăng hôm nay, bài thất bại.
- Hiển thị trạng thái hệ thống theo thời gian thực.

### 📱 Quản lý Fanpage
- Kết nối nhiều Facebook Fanpage thông qua Facebook Login OAuth.
- Quản lý **Facebook App** (App ID / App Secret) theo từng tài khoản người dùng.
- Cập nhật Access Token khi token hết hạn mà không mất cấu hình.
- Xem trạng thái kết nối và thu hồi quyền truy cập bất kỳ lúc nào.

### 🤖 AI Content Studio
- Sinh bài viết Facebook từ chủ đề và từ khóa tùy chỉnh.
- Sinh hình ảnh minh họa bằng Gemini AI (hoặc fallback về Unsplash API).
- Chỉnh sửa nội dung, tái sinh một phần (text hoặc ảnh) trước khi đăng.
- Đăng lên Fanpage trực tiếp hoặc lưu vào hàng đợi.

### 📅 Automation & Lập lịch
- Tạo lịch đăng bài định kỳ: chọn Fanpage, chủ đề, giờ đăng, số lượng bài trong một lần chạy.
- Hệ thống **Cron Job** tự động kích hoạt đúng giờ, sinh content và đăng lên Facebook.
- Hỗ trợ **Advanced Prompt** để tinh chỉnh giọng văn, phong cách theo từng chiến dịch.
- Quản lý trạng thái lịch trình: `active` / `suspended`.

### 🗺️ AI Campaign Architect
- Lập kế hoạch chiến dịch nội dung dài hạn theo phễu marketing **Hook → Narrative → Conversion**.
- **Visual Journey Explorer**: bản đồ nội dung trực quan, hỗ trợ kéo thả (Drag & Drop) để sắp xếp lại thứ tự bài viết.
- Tự động sinh chuỗi bài viết có liên kết logic, phù hợp cho các chiến dịch ra mắt sản phẩm, thương hiệu, sự kiện.

### 📊 Lịch sử bài đăng
- Xem toàn bộ bài viết đã đăng theo Fanpage hoặc theo chiến dịch.
- Lọc theo trạng thái: `published`, `failed`, `queued`.
- Xem chi tiết nội dung, ảnh, thông tin lỗi (nếu có).

### ⚙️ Cài đặt & Hồ sơ
- Cập nhật thông tin cá nhân và mật khẩu.
- Quản lý Facebook App credentials.
- Hướng dẫn tích hợp (setup guide) tích hợp ngay trong UI.

### 👑 Admin Panel
- Quản lý toàn bộ người dùng trong hệ thống.
- Kích hoạt / thu hồi quyền truy cập tài khoản.
- Chỉ hiển thị với tài khoản có role `admin`.

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                     │
│  React 19 + TypeScript  ·  Vite 6  ·  TailwindCSS 4        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │  AI      │  │Campaign  │  │Settings  │   │
│  │ View     │  │ Studio   │  │Architect │  │  View    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│               ApiService Layer (centralized)                │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP / REST API
┌───────────────────────▼─────────────────────────────────────┐
│                  SERVER (Node.js / Express)                  │
│  server.ts (monolith + modular route handlers)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐  │
│  │Auth &    │  │Facebook  │  │  AI Generation Pipeline  │  │
│  │JWT Guard │  │Graph API │  │  (Gemini text + image)   │  │
│  └──────────┘  └──────────┘  └──────────────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐  │
│  │ Cron Job │  │ Cloudinary│  │  Prisma ORM (SQLite)     │  │
│  │(node-cron│  │(Image    │  │                          │  │
│  │scheduler)│  │ storage) │  │                          │  │
│  └──────────┘  └──────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Luồng nghiệp vụ chính

```
User tạo Schedule
      │
      ▼
Cron Job kích hoạt đúng giờ
      │
      ├──▶ Gemini AI sinh nội dung bài viết
      │
      ├──▶ Gemini AI sinh / tìm kiếm hình ảnh
      │    └──▶ Tải lên Cloudinary (Storage lâu dài)
      │
      ├──▶ Lưu Post vào DB (status: queued)
      │
      └──▶ Gọi Facebook Graph API đăng bài
               │
               ├── Thành công → status: posted
               └── Thất bại   → status: failed + ghi lỗi
```

---

## 🛠️ Tech Stack

### Frontend
| Công nghệ             | Phiên bản  | Mục đích                                          |
|-----------------------|------------|---------------------------------------------------|
| **React**             | ^19.0.0    | UI framework chính                                |
| **TypeScript**        | ~5.8.2     | Type safety toàn bộ codebase                      |
| **Vite**              | ^6.2.0     | Build tool & Dev server (HMR)                     |
| **TailwindCSS**       | ^4.1.14    | Utility-first CSS framework                       |
| **Motion (Framer)**   | ^12.23.24  | Animations & transitions                          |
| **Lucide React**      | ^0.546.0   | Icon library                                      |

### Backend
| Công nghệ             | Phiên bản  | Mục đích                                          |
|-----------------------|------------|---------------------------------------------------|
| **Node.js + Express** | ^4.21.2    | HTTP server & REST API                            |
| **tsx**               | ^4.21.0    | TypeScript execution (dev mode)                   |
| **esbuild**           | ^0.27.4    | Bundle server cho production                      |
| **node-cron**         | ^4.2.1     | Cron job scheduler (tự động đăng bài)             |
| **Multer**            | ^2.1.1     | File upload (ảnh AI tạo ra)                       |
| **bcryptjs**          | ^3.0.3     | Hash mật khẩu người dùng                         |
| **jsonwebtoken**      | ^9.0.3     | Xác thực JWT                                      |
| **Cloudinary**        | ^2.5.1     | Lưu trữ hình ảnh trên đám mây (Cloud Storage)   |

### Database & ORM
| Công nghệ       | Phiên bản  | Mục đích                                              |
|-----------------|------------|-------------------------------------------------------|
| **Prisma ORM**  | ^6.19.3    | Type-safe database client                             |
| **SQLite**      | (Prisma)   | Database nhúng, dễ deploy, không cần server riêng     |

### AI & Tích hợp bên thứ ba
| Dịch vụ                    | Mục đích                                              |
|----------------------------|-------------------------------------------------------|
| **Google Gemini AI**       | Sinh nội dung văn bản & hình ảnh cho bài đăng         |
| **Facebook Graph API**     | Đăng bài lên Fanpage, OAuth Fanpage connection        |
| **Unsplash API** (fallback)| Hình ảnh dự phòng khi Gemini image generation thất bại|
| **Cloudinary**             | Nền tảng lưu trữ và tối ưu hóa hình ảnh              |

---

## 📂 Cấu trúc dự án

```
fanpage-ai-manager/
├── prisma/
│   └── schema.prisma          # Database schema (User, Fanpage, Schedule, Post, Topic)
├── public/
│   └── uploads/               # Ảnh local (fallback nếu không có Cloudinary)
├── src/
│   ├── api/
│   │   └── index.ts           # ApiService — tầng giao tiếp Backend tập trung
│   ├── components/
│   │   ├── AIContentView.tsx   # Sinh & đăng bài thủ công bằng AI
│   │   ├── AICreativeStudio.tsx # Editor chỉnh sửa bài viết AI cao cấp
│   │   ├── AdminView.tsx       # Quản lý người dùng (admin only)
│   │   ├── AuthView.tsx        # Đăng nhập / Đăng ký
│   │   ├── AutomationView.tsx  # Quản lý lịch đăng bài tự động
│   │   ├── CampaignPlannerView.tsx # AI Campaign Architect
│   │   ├── DashboardView.tsx   # Tổng quan số liệu
│   │   ├── FanpageView.tsx     # Kết nối & quản lý Fanpage
│   │   ├── HistoryView.tsx     # Lịch sử bài đăng
│   │   ├── SettingsView.tsx    # Cài đặt tài khoản & Facebook App
│   │   └── StatusBadge.tsx     # Badge hiển thị trạng thái
│   ├── hooks/                  # Custom React hooks
│   ├── App.tsx                 # Root component, routing & auth state
│   ├── LanguageContext.tsx     # i18n context (VI/EN)
│   ├── config.ts               # Cấu hình ứng dụng
│   ├── translations.ts         # Nội dung đa ngôn ngữ
│   ├── types.ts                # TypeScript interfaces chung
│   ├── index.css               # Global styles
│   └── main.tsx                # Entry point React
├── server.ts                   # Express server — API routes, Cron jobs, Auth
├── .env.example                # Mẫu biến môi trường
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── package.json
```

---

## ⚙️ Data Models (Prisma Schema)

| Model           | Mô tả                                                                 |
|-----------------|-----------------------------------------------------------------------|
| `User`          | Tài khoản người dùng, phân quyền `user` / `admin`                    |
| `FacebookApp`   | Facebook App (App ID + Secret) do người dùng đăng ký                 |
| `Fanpage`       | Fanpage đã kết nối, lưu Access Token và Page ID                      |
| `Schedule`      | Lịch trình đăng bài tự động (topic, time, runCount, status)          |
| `Post`          | Bài viết đã sinh (content, imageUrl, status, error log)              |
| `Topic`         | Chủ đề nội dung với từ khóa, dùng cho lập kế hoạch chiến dịch       |

---

## 🚀 Hướng dẫn cài đặt

### Yêu cầu
- **Node.js** >= 18.x
- Tài khoản **Google AI Studio** để lấy Gemini API Key
- **Facebook Developer App** với quyền `pages_manage_posts`
- **Cloudinary** (Tùy chọn) để lưu trữ ảnh bền vững

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình biến môi trường

Tạo file `.env` từ mẫu:

```bash
cp .env.example .env
```

Điền các giá trị vào `.env`:

```env
GEMINI_API_KEY="your_gemini_api_key"
APP_URL="http://localhost:3000"
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="your_secure_password"

# Cloudinary (Tùy chọn, để lưu trữ ảnh bền vững)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

### 3. Khởi tạo database

Ứng dụng hỗ trợ cả **SQLite** và **PostgreSQL**. Mặc định là SQLite.

**Để chuyển sang PostgreSQL:**
1. Chạy lệnh: `npm run db:postgres`
2. Cập nhật `DATABASE_URL` trong file `.env` thành chuỗi kết nối Postgres của bạn.
3. Chạy migration: `npx prisma migrate dev --name init_postgres`

**Để quay lại SQLite:**
1. Chạy lệnh: `npm run db:sqlite`
2. Đảm bảo `DATABASE_URL="file:./dev.db"` trong file `.env`.
3. Chạy migration: `npx prisma migrate dev --name init_sqlite`

Sau khi cấu hình xong, chạy tiếp:
```bash
npx prisma generate
```

### 4. Chạy ứng dụng (Development)

```bash
npm run dev
```

Ứng dụng sẽ khởi động tại: `http://localhost:3000`

### 5. Build production

```bash
npm run build
npm start
```

---

## 🔐 Bảo mật

- **JWT Authentication**: mọi API đều yêu cầu Bearer token, trừ `/api/auth/login`.
- **Role-based Access Control**: endpoint `/api/admin/*` chỉ cho phép role `admin`.
- **Server-side AI**: Gemini API Key chỉ được dùng phía server — không bao giờ expose ra client.
- **Token isolation**: Access Token Facebook của mỗi user chỉ dùng được trong phạm vi tài khoản đó.
- **Password hashing**: mật khẩu được hash bằng `bcryptjs` trước khi lưu DB.

---

## 🌐 API Endpoints tóm tắt

| Method | Endpoint                      | Mô tả                                  |
|--------|-------------------------------|----------------------------------------|
| POST   | `/api/auth/login`             | Đăng nhập, trả về JWT                  |
| GET    | `/api/auth/me`                | Lấy thông tin user hiện tại            |
| GET    | `/api/dashboard`              | Số liệu tổng quan                      |
| GET    | `/api/fanpages`               | Danh sách Fanpage đã kết nối           |
| DELETE | `/api/fanpages/:id`           | Xóa kết nối Fanpage                    |
| PATCH  | `/api/fanpages/:id/token`     | Cập nhật Access Token                  |
| GET    | `/api/schedules`              | Danh sách lịch trình                   |
| POST   | `/api/schedules`              | Tạo lịch trình mới                     |
| DELETE | `/api/schedules/:id`          | Xóa lịch trình                         |
| GET    | `/api/posts`                  | Lịch sử bài đăng                       |
| POST   | `/api/facebook/post`          | Đăng bài lên Fanpage ngay lập tức      |
| POST   | `/api/ai/generate-text`       | Sinh nội dung bài viết bằng Gemini     |
| POST   | `/api/ai/generate-image`      | Sinh hình ảnh bằng Gemini              |
| GET    | `/api/media/:filename`        | Truy cập file ảnh đã upload            |
| GET    | `/api/topics`                 | Danh sách chủ đề                       |
| GET    | `/api/facebook-apps`          | Danh sách Facebook App đã đăng ký     |
| GET    | `/api/admin/users`            | (Admin) Danh sách người dùng           |

---

## 📝 License

MIT License — dự án mã nguồn mở, tự do sử dụng và phát triển.
