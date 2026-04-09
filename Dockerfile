FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

# Make entrypoint executable
RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

ENTRYPOINT ["sh", "docker-entrypoint.sh"]
