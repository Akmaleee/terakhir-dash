FROM node:22-alpine

WORKDIR /app

# Install dependency for Prisma + native modules
RUN apk add --no-cache libc6-compat openssl chromium nss

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the app
COPY . .

# Re-generate Prisma client inside container (Linux compatible)
RUN npx prisma generate

# Build Next.js app
RUN NEXT_SKIP_PRERENDER_CHECK=true npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]