# فضفضة عشوائية — Dockerfile
FROM node:20-slim

WORKDIR /app

# أدوات البناء اللازمة لتجميع better-sqlite3 (تُحذف بعد التثبيت)
COPY package.json package-lock.json* ./
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && (npm ci --omit=dev || npm install --omit=dev) \
  && apt-get purge -y python3 make g++ \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*

COPY . .
RUN mkdir -p data

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
