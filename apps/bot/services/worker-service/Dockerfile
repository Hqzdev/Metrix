FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build 2>/dev/null || true
CMD ["node", "--experimental-vm-modules", "dist/index.js"]
