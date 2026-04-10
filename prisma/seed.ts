import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@floral.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });
  
  if (existingAdmin) {
    console.log(`ℹ️ Tài khoản Root Admin (${adminEmail}) đã tồn tại. Bỏ qua bước Seeding.`);
    return;
  }

  console.log('🌱 Đang khởi tạo dữ liệu mẫu...');

  // 1. Tạo tài khoản Admin
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'System Admin',
      role: 'admin',
      isActive: true,
      requirePasswordChange: true,
    },
  });

  console.log(`✅ Đã tạo/cập nhật tài khoản Admin: ${admin.email}`);
  console.log('🚀 Seeding hoàn tất!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
