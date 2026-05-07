#!/bin/sh

# Đồng bộ cấu trúc Database (tạo bảng nếu chưa có)
npx prisma db push --accept-data-loss

# Khởi tạo dữ liệu mẫu (Admin account)
npx prisma db seed

# Start the application
npm start

