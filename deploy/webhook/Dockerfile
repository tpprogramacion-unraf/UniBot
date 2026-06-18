FROM node:20-alpine

WORKDIR /webhook

RUN apk add --no-cache docker-cli docker-cli-compose git bash

COPY server.js package.json ./
RUN npm install --production

EXPOSE 9000

CMD ["node", "server.js"]
