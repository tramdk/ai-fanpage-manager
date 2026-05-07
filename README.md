---
title: Fanpage AI Manager
emoji: 🤖
colorFrom: indigo
colorTo: blue
sdk: docker
pinned: false
---

# 🤖 Fanpage AI Manager


> **Nền tảng quản lý & tự động hóa nội dung Facebook Fanpage bằng AI** — đăng bài thông minh, lập lịch tự động, sinh nội dung bằng Gemini AI & tìm kiếm hình ảnh chất lượng cao từ Internet.

---

## 📖 Tổng quan dự án

**Fanpage AI Manager** là một ứng dụng web full-stack giúp các cá nhân và doanh nghiệp quản lý nhiều Facebook Fanpage từ một giao diện duy nhất. Thay vì thủ công tạo nội dung và đăng bài, hệ thống tự động sinh bài viết chất lượng cao bằng Google Gemini AI, lên lịch đăng bài theo khung giờ tùy chỉnh, và theo dõi toàn bộ lịch sử hoạt động.

### 🎯 Mục tiêu nghiệp vụ

| Vấn đề                                         | Giải pháp                                                    |
|------------------------------------------------|--------------------------------------------------------------|
| Tốn thời gian tạo nội dung thủ công            | AI sinh content tự động + tìm ảnh liên quan từ Internet     |
| Khó quản lý nhiều Fanpage cùng lúc             | Dashboard tập trung, kết nối đa Fanpage qua Facebook API     |
| Thiếu nhất quán trong lịch đăng bài            | Hệ thống lập lịch (Cron Job) tự động hóa theo giờ cố định   |
| Không có chiến lược nội dung dài hạn           | AI Campaign Architect tạo chuỗi bài theo phễu marketing       |
| Rủi ro bảo mật khi quản lý nhiều token         | Multi-tenant, mỗi user quản lý token của riêng mình         |

---

## ✨ Tính năng chính (Premium Upgrade)

### 🎨 TDK 
- **Giao diện Tactile cao cấp**: Toàn bộ hệ thống được xây dựng trên ngôn ngữ thiết kế Soft UI hiện đại, mang lại cảm giác chiều sâu và tương tác vật lý chân thực.
- **Dark Mode First**: Ưu tiên giao diện tối (Obsidian Dark) để bảo vệ mắt và tăng tính thẩm mỹ, hỗ trợ chuyển đổi Light/Dark linh hoạt.
- **Hệ thống Design System nhất quán**: Sử dụng CSS variables cho toàn bộ màu sắc, đổ bóng và spacing, đảm bảo tính thẩm mỹ đồng bộ trên mọi module.

### 🏠 Dashboard & Analytics (Responsive)
- **Grid linh hoạt**: Dashboard tự động điều chỉnh layout (1/2/3 cột) dựa trên kích thước màn hình.
- **Neural Stats Cards**: Hiển thị số liệu tổng quan với hiệu ứng hover động và scaling thông minh.
- **Performance Trends**: Biểu đồ xu hướng dữ liệu với khả năng scale mượt mà trên cả tablet và desktop.

### 🗺️ AI Strategy Workflow Architect
- **Visual Node Builder**: Xây dựng chiến lược nội dung bằng bản đồ tư duy trực quan. Kéo thả các Neural Node để thiết kế kịch bản marketing.
- **Theme-Aware Connectors**: Hệ thống dây nối thông minh tự động thay đổi độ sáng và màu sắc theo theme, hỗ trợ hiệu ứng glow khi hover.
- **Protocol Settings Panel**: Panel cấu hình node chuyên sâu với hiệu ứng backdrop-blur và shadow định hướng, giúp tinh chỉnh chi tiết từng bước trong quy trình.

### 🤖 Social Discover Studio
- **Neural Draft Generator**: Sinh bài viết Facebook từ chủ đề và từ khóa tùy chỉnh bằng Gemini AI với giọng văn đa dạng.
- **Media Asset Sourcing**: Tự động tìm kiếm hình ảnh chất lượng cao từ Unsplash, Pexels, LoremFlickr — tiết kiệm chi phí so với AI generation.
- **Advanced Creative Editor**: Chỉnh sửa nội dung và media trong một không gian làm việc tập trung, hỗ trợ preview thời gian thực.

### 📊 Hoạt động & Lịch sử (Advanced Grid)
- **Resizable Columns**: Lưới dữ liệu cho phép người dùng **tùy chỉnh độ rộng cột** bằng cách kéo thả thủ công, tối ưu hóa không gian hiển thị thông tin.
- **Sticky Strategic Header**: Tiêu đề bảng cố định khi cuộn, giúp theo dõi các cột dữ liệu trong danh sách dài một cách dễ dàng.
- **Fluid Height Scroll**: Hệ thống lưới tự động scale theo chiều cao màn hình và cuộn nội dung bên trong, giữ cho UI luôn gọn gàng.

### 📅 Automation & Lập lịch
- **Cron Job Engine**: Tự động hóa việc đăng bài theo lịch trình chính xác.
- **Advanced Prompting**: Tinh chỉnh AI cho từng lịch trình cụ thể (giọng văn, chỉ dẫn đặc biệt).
- **Queue Management**: Quản lý hàng đợi bài viết với khả năng kéo thả sắp xếp lại thứ tự ưu tiên.

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  React 19 + TypeScript  ·  Vite 6  ·  TailwindCSS 4            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Dashboard │  │  AI      │  │Campaign  │  │Settings  │        │
│  │ View     │  │ Studio   │  │Architect │  │  View    │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                   ApiService Layer (centralized)                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / REST API
┌──────────────────────────▼──────────────────────────────────────┐
│                  SERVER (Node.js / Express)                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Route Layer (Thin)                      │    │
│  │  auth · fanpage · ai · schedule · post · admin · ...    │    │
│  └───────────────────────┬─────────────────────────────────┘    │
│                          │ delegates to                          │
│  ┌───────────────────────▼─────────────────────────────────┐    │
│  │                 Service Layer (Business Logic)           │    │
│  │  AuthService  ·  AiService  ·  FanpageService           │    │
│  │  ScheduleService  ·  PostService  ·  OAuthService        │    │
│  │  AdminService  ·  FbAppService  ·  FacebookService       │    │
│  └───────────────────────┬─────────────────────────────────┘    │
│                          │                                       │
│  ┌───────────────────────▼─────────────────────────────────┐    │
│  │              Infrastructure Layer                        │    │
│  │  Prisma ORM  ·  node-cron  ·  Cloudinary  ·  Multer     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Luồng tìm kiếm hình ảnh (Image Discovery)

```
User yêu cầu tìm ảnh
       │
       ├── Có Keywords (từ Automation Settings)? → Dùng Keywords làm search query
       └── Không có Keywords? → Dùng Topic Name làm search query
       │
       ▼
  Unsplash API (ưu tiên 1, cần API Key) ──▶ Thất bại?
       │                                               │
       ▼ Thành công                                    ▼
  Tải buffer → Upload Cloudinary             Pexels API (ưu tiên 2, cần API Key)
       │                                               │
       ▼                                               ▼ Thất bại?
  Trả imageUrl                               LoremFlickr (fallback miễn phí)
                                                       │
                                                       ▼ Thất bại?
                                               Picsum (fallback cuối)
```

> **Lưu ý**: Không sử dụng AI để sinh ảnh (zero AI cost cho hình ảnh). Chỉ dùng Gemini cho việc sinh văn bản.

### Luồng đăng bài tự động (Cron Job)

```
Cron Job kích hoạt đúng giờ (node-cron)
       │
       ├──▶ Lấy bài "queued" đầu tiên trong hàng đợi
       │
       ├──▶ Giải mã Access Token (AES encryption)
       │
       ├──▶ Gọi Facebook Graph API v18.0
       │         ├── Text only → /feed
       │         ├── 1 ảnh    → /photos
       │         └── n ảnh    → /feed + attached_media
       │
       └──▶ Cập nhật trạng thái Post
                 ├── Thành công → status: published
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
| **Lucide React**      | ^0.546.0   | Icon library                                      |

### Backend
| Công nghệ             | Phiên bản  | Mục đích                                          |
|-----------------------|------------|---------------------------------------------------|
| **Node.js + Express** | ^4.21.2    | HTTP server & REST API                            |
| **tsx**               | ^4.21.0    | TypeScript execution (dev mode)                   |
| **node-cron**         | ^4.2.1     | Cron job scheduler (tự động đăng bài)             |
| **Multer**            | ^2.1.1     | File upload (ảnh, video)                          |
| **bcryptjs**          | ^3.0.3     | Hash mật khẩu người dùng                         |
| **jsonwebtoken**      | ^9.0.3     | Xác thực JWT                                      |
| **Cloudinary**        | ^2.5.1     | Lưu trữ hình ảnh trên đám mây                    |
| **@google/genai**     | ^1.29.0    | Google Gemini AI SDK                              |

### Database & ORM
| Công nghệ       | Phiên bản  | Mục đích                                              |
|-----------------|------------|-------------------------------------------------------|
| **Prisma ORM**  | ^6.19.3    | Type-safe database client                             |
| **PostgreSQL**  | -          | Database production                                   |

### Image Discovery & Tích hợp bên thứ ba
| Dịch vụ                     | Mục đích                                              |
|-----------------------------|-------------------------------------------------------|
| **Google Gemini AI**        | Sinh nội dung văn bản (chỉ text, không dùng cho ảnh)  |
| **Unsplash API**            | Tìm kiếm ảnh chất lượng cao — ưu tiên số 1 (miễn phí)|
| **Pexels API**              | Tìm kiếm ảnh chất lượng cao — ưu tiên số 2 (miễn phí)|
| **LoremFlickr**             | Fallback tìm ảnh miễn phí (không cần API key)         |
| **Picsum**                  | Fallback cuối cùng (ảnh ngẫu nhiên, luôn khả dụng)    |
| **Facebook Graph API v18**  | Đăng bài lên Fanpage, OAuth Fanpage connection        |
| **Cloudinary**              | Lưu trữ và tối ưu hóa hình ảnh                       |

---

## 📂 Cấu trúc dự án

```
fanpage-ai-manager/
├── prisma/
│   └── schema.prisma             # DB schema (User, Fanpage, Schedule, Post, Topic)
├── public/
│   └── uploads/                  # Ảnh local (fallback nếu Cloudinary không khả dụng)
├── backend/                      # Express Server (Service-Oriented Architecture)
│   ├── index.ts                  # Entry point: khởi động server & load schedules
│   ├── app.ts                    # Express app config & route mounting
│   ├── routes/                   # HTTP Route handlers (thin — chỉ điều phối)
│   │   ├── auth.routes.ts        # Đăng nhập, đăng ký, setup password, OAuth URL
│   │   ├── admin.routes.ts       # Quản lý người dùng (admin only)
│   │   ├── ai.routes.ts          # Sinh content & hình ảnh bằng AI
│   │   ├── fanpage.routes.ts     # Quản lý Fanpage & đăng bài thủ công
│   │   ├── fbapp.routes.ts       # Quản lý Facebook App credentials
│   │   ├── oauth.routes.ts       # Facebook OAuth callback handler
│   │   ├── post.routes.ts        # Lịch sử, hàng đợi, sắp xếp bài viết
│   │   ├── schedule.routes.ts    # Tạo & quản lý lịch trình tự động
│   │   ├── topic.routes.ts       # Quản lý chủ đề & từ khóa
│   │   ├── dashboard.routes.ts   # Số liệu tổng quan
│   │   └── user.routes.ts        # Cập nhật hồ sơ người dùng
│   ├── services/                 # Business logic layer (tái sử dụng được)
│   │   ├── ai.service.ts         # generateText(), generateImage() — image discovery từ Internet
│   │   ├── auth.service.ts       # login(), register(), setupPassword(), getMe()
│   │   ├── admin.service.ts      # listUsers(), setUserStatus(), resetPassword()
│   │   ├── fanpage.service.ts    # listFanpages(), updateToken(), postDirectly()
│   │   ├── fbapp.service.ts      # listApps(), createApp(), deleteApp()
│   │   ├── facebook.service.ts   # postToFacebook() — xử lý đa media cho Graph API
│   │   ├── oauth.service.ts      # handleFacebookCallback() — token exchange & sync
│   │   ├── post.service.ts       # getPostHistory(), queuePost(), reorderPosts()
│   │   ├── schedule.service.ts   # createSchedule(), deleteSchedule(), updateStatus()
│   │   ├── topic.service.ts      # listTopics(), createTopic(), deleteTopic()
│   │   └── cron.service.ts       # scheduleJob() — cron job engine
│   ├── tests/                    # Backend Test Suite
│   │   └── ai-service.test.ts    # Test: text gen, image discovery, keywords, Cloudinary
│   ├── middleware/
│   │   └── auth.ts               # authenticateToken(), authenticateAdmin()
│   ├── config/
│   │   ├── prisma.ts             # Prisma client singleton
│   │   └── cloudinary.ts         # Cloudinary upload helper
│   └── utils/
│       └── encryption.ts         # AES encrypt/decrypt cho Access Tokens
├── src/                          # React Frontend
│   ├── api/
│   │   └── index.ts              # ApiService — tầng giao tiếp Backend tập trung
│   ├── components/
│   │   ├── AIContentView.tsx     # Social Discover — sinh bài & tìm ảnh từ Internet
│   │   ├── AICreativeStudio.tsx  # Editor chỉnh sửa bài viết cao cấp
│   │   ├── AdminView.tsx         # Quản lý người dùng (admin only)
│   │   ├── AuthView.tsx          # Đăng nhập / Đăng ký
│   │   ├── AutomationSettings.tsx# Component cấu hình AI cho lịch trình
│   │   ├── AutomationView.tsx    # Quản lý lịch đăng bài tự động
│   │   ├── CampaignPlannerView.tsx # AI Campaign Architect
│   │   ├── DashboardView.tsx     # Tổng quan số liệu
│   │   ├── FanpageView.tsx       # Kết nối & quản lý Fanpage
│   │   ├── HistoryView.tsx       # Lịch sử bài đăng
│   │   ├── SettingsView.tsx      # Cài đặt tài khoản & Facebook App
│   │   └── StatusBadge.tsx       # Badge hiển thị trạng thái
│   ├── App.tsx                   # Root component, routing & auth state
│   ├── LanguageContext.tsx       # i18n context (VI/EN)
│   ├── config.ts                 # Cấu hình ứng dụng
│   ├── translations.ts           # Nội dung đa ngôn ngữ
│   └── types.ts                  # TypeScript interfaces chung
├── .env.example                  # Mẫu biến môi trường
├── docker-compose.yml            # Docker config (PostgreSQL)
├── vite.config.ts                # Vite configuration
└── package.json
```

---

## ⚙️ Data Models (Prisma Schema)

| Model           | Mô tả                                                                      |
|-----------------|----------------------------------------------------------------------------|
| `User`          | Tài khoản người dùng, phân quyền `user` / `admin`                         |
| `FacebookApp`   | Facebook App (App ID + Secret) do người dùng đăng ký                      |
| `Fanpage`       | Fanpage đã kết nối, lưu Access Token mã hóa và Page ID                    |
| `Schedule`      | Lịch trình đăng bài tự động (topic, time, runCount, advancedPrompt, status)|
| `Post`          | Bài viết (content, imageUrl, status, fbPostId, error log)                 |
| `Topic`         | Chủ đề nội dung với từ khóa, dùng cho lập kế hoạch chiến dịch            |

---

## 🚀 Hướng dẫn cài đặt

### Yêu cầu
- **Node.js** >= 18.x
- Tài khoản **Google AI Studio** để lấy Gemini API Key
- **Facebook Developer App** với quyền `pages_manage_posts`
- **Docker** (để chạy PostgreSQL) hoặc chuỗi kết nối PostgreSQL sẵn có
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
# === BẮT BUỘC ===
DATABASE_URL="postgresql://user:password@localhost:5433/fanpage_ai_manager"
GEMINI_API_KEY="your_gemini_api_key"     # Chỉ dùng cho sinh văn bản
APP_URL="http://localhost:3000"

# === TÙY CHỌN (nhưng khuyến nghị) ===
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="your_secure_password"

# Cloudinary (lưu trữ ảnh tìm được)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Stock Photo API Keys (MIỄN PHÍ — khuyến nghị để có ảnh chất lượng cao)
# Đăng ký tại: https://unsplash.com/developers
UNSPLASH_ACCESS_KEY=""
# Đăng ký tại: https://www.pexels.com/api/
PEXELS_API_KEY=""
```

### 3. Khởi động Database (Docker)

```bash
docker-compose up -d
```

### 4. Khởi tạo database schema

```bash
npx prisma db push
npx prisma generate
```

### 5. Chạy test suite

```bash
npm test
```

Đảm bảo tất cả test case đều pass trước khi chạy hoặc commit.

### 6. Chạy ứng dụng (Development)

```bash
npm run dev
```

Ứng dụng sẽ khởi động tại: `http://localhost:3000`

### 7. Build production

```bash
npm run build
npm start
```

---

## 🔐 Bảo mật

- **JWT Authentication**: mọi API đều yêu cầu Bearer token, trừ `/api/auth/login` và `/api/auth/register`.
- **Role-based Access Control**: endpoint `/api/admin/*` chỉ cho phép role `admin`.
- **Server-side AI**: Gemini API Key chỉ được dùng phía server — không bao giờ expose ra client.
- **Token Encryption**: Access Token Facebook được mã hóa bằng AES trước khi lưu DB.
- **Token isolation**: token của mỗi user chỉ dùng được trong phạm vi tài khoản đó.
- **Password hashing**: mật khẩu được hash bằng `bcryptjs` (salt rounds: 10).
- **Mandatory Password Change**: Admin có thể yêu cầu người dùng đổi mật khẩu ngay lần đăng nhập tiếp theo.

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint                      | Mô tả                                  |
|--------|-------------------------------|----------------------------------------|
| POST   | `/api/auth/register`          | Đăng ký tài khoản mới                  |
| POST   | `/api/auth/login`             | Đăng nhập, trả về JWT                  |
| POST   | `/api/auth/setup-password`    | Đổi mật khẩu lần đầu (setup token)    |
| GET    | `/api/auth/me`                | Lấy thông tin user hiện tại            |
| GET    | `/api/auth/facebook/url`      | Lấy URL Facebook OAuth                 |

### Fanpage
| Method | Endpoint                      | Mô tả                                  |
|--------|-------------------------------|----------------------------------------|
| GET    | `/api/fanpages`               | Danh sách Fanpage đã kết nối           |
| PATCH  | `/api/fanpages/:id/token`     | Cập nhật Access Token                  |
| DELETE | `/api/fanpages/:id`           | Xóa kết nối Fanpage                    |
| POST   | `/api/facebook/post`          | Đăng bài lên Fanpage ngay lập tức      |

### AI
| Method | Endpoint                      | Mô tả                                  |
|--------|-------------------------------|----------------------------------------|
| POST   | `/api/ai/generate-text`       | Sinh nội dung bài viết bằng Gemini     |
| POST   | `/api/ai/generate-image`      | Tìm hình ảnh từ Internet (Unsplash → Pexels → LoremFlickr). Body: `{ topic, prompt?, keywords? }` |

### Posts
| Method | Endpoint                      | Mô tả                                  |
|--------|-------------------------------|----------------------------------------|
| GET    | `/api/posts`                  | Lịch sử bài đăng (kèm tên Fanpage)    |
| PUT    | `/api/posts/:id`              | Chỉnh sửa bài đang queued             |
| POST   | `/api/posts/queue`            | Thêm bài vào hàng đợi                 |
| POST   | `/api/posts/reorder`          | Sắp xếp lại thứ tự hàng đợi          |

### Schedules
| Method | Endpoint                       | Mô tả                                  |
|--------|--------------------------------|----------------------------------------|
| GET    | `/api/schedules`               | Danh sách lịch trình                   |
| POST   | `/api/schedules`               | Tạo lịch trình mới                     |
| GET    | `/api/schedules/:id/posts`     | Bài trong hàng đợi của lịch trình      |
| PATCH  | `/api/schedules/:id/status`    | Cập nhật trạng thái (active/suspended) |
| DELETE | `/api/schedules/:id`           | Xóa lịch trình                         |

### Topics & Facebook Apps
| Method | Endpoint                      | Mô tả                                  |
|--------|-------------------------------|----------------------------------------|
| GET    | `/api/topics`                 | Danh sách chủ đề                       |
| POST   | `/api/topics`                 | Tạo chủ đề mới                         |
| DELETE | `/api/topics/:id`             | Xóa chủ đề                             |
| GET    | `/api/facebook-apps`          | Danh sách Facebook App đã đăng ký     |
| POST   | `/api/facebook-apps`          | Thêm Facebook App mới                  |
| DELETE | `/api/facebook-apps/:id`      | Xóa Facebook App                       |

### Admin
| Method | Endpoint                            | Mô tả                                  |
|--------|-------------------------------------|----------------------------------------|
| GET    | `/api/admin/users`                  | Danh sách người dùng                   |
| PUT    | `/api/admin/users/:id/status`       | Kích hoạt / vô hiệu hóa tài khoản     |
| POST   | `/api/admin/users/:id/reset-password` | Reset mật khẩu tạm thời             |
| POST   | `/api/admin/users/:id/revoke`       | Thu hồi quyền truy cập                 |

---

## 🧪 Testing

Dự án sử dụng hệ thống test tự viết nằm trong `backend/tests/`. Chạy toàn bộ test suite bằng:

```bash
npm test
```

### Test coverage hiện tại

| File                          | Nội dung kiểm thử                                            |
|-------------------------------|--------------------------------------------------------------|
| `ai-service.test.ts`          | Text generation, Image discovery (keywords ưu tiên, topic fallback), Cloudinary upload |

> **Quy tắc**: Mọi thay đổi phải pass toàn bộ test case trước khi commit.

---

## 📝 License

MIT License — dự án mã nguồn mở, tự do sử dụng và phát triển.
