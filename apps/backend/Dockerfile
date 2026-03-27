FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN npm run build

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3001

CMD ["./entrypoint.sh"]
