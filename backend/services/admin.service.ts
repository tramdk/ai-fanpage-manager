import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';

const TEMP_PASSWORD = 'password@123';

export async function listUsers() {
  return prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function setUserStatus(id: string, isActive: boolean) {
  return prisma.user.update({ where: { id }, data: { isActive } });
}

export async function resetUserPassword(id: string) {
  const hashedPassword = await bcrypt.hash(TEMP_PASSWORD, 10);
  await prisma.user.update({ where: { id }, data: { password: hashedPassword, requirePasswordChange: true } });
  return { tempPassword: TEMP_PASSWORD };
}

export async function revokeUser(id: string) {
  return prisma.user.update({ where: { id }, data: { isActive: false } });
}
