# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run prisma:generate

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run build && npm run start -- --hostname 0.0.0.0 --port 3000"]
