FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files (lockfile optional)
COPY package*.json ./
RUN npm install

# Copy all source code
COPY . .

# Build the application (React + Vite + esbuild for Express)
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

ENV NODE_ENV=production

# Start the Node.js Express server
CMD ["npm", "start"]
