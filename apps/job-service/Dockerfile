FROM node:20.12.2-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY ./apps/job-service ./apps/job-service
COPY ./shared ./shared

WORKDIR /app/apps/job-service
RUN npm run build

CMD ["node", "dist/main.js"]
