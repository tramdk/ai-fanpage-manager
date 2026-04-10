import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const dbType = process.argv[2]; // 'sqlite' or 'postgres'

if (!['sqlite', 'postgres'].includes(dbType)) {
  console.error('❌ Vui lòng chọn db type: sqlite hoặc postgres');
  process.exit(1);
}

try {
  let content = fs.readFileSync(schemaPath, 'utf8');
  
  if (dbType === 'sqlite') {
    content = content.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
    // Đảm bảo URL cũng phù hợp nếu cần, nhưng Prisma khuyến khích dùng env()
    console.log('✅ Đã chuyển Prisma provider sang: sqlite');
  } else {
    content = content.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
    console.log('✅ Đã chuyển Prisma provider sang: postgresql');
  }

  fs.writeFileSync(schemaPath, content);
  console.log('🚀 Tiếp theo: Hãy cập nhật DATABASE_URL trong .env và chạy "npx prisma generate"');
} catch (err) {
  console.error('❌ Lỗi khi chuyển đổi schema:', err.message);
  process.exit(1);
}
