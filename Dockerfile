FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build frontend and backend
RUN npm run build

FROM node:20-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/start.sh ./start.sh

# Set permissions
RUN chmod +x start.sh

# Environment variables
ENV NODE_ENV=production
ENV PORT=7860

# Expose port
EXPOSE 7860

# Command to run the app
CMD ["./start.sh"]
