FROM node:24-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY docs ./docs
COPY README.md .env.example ./

USER node
EXPOSE 8080
CMD ["node", "src/server.js"]
