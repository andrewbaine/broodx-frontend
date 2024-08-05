FROM node:22-alpine3.19

WORKDIR /app

COPY package.json package-lock.json /app/

RUN npm install --production

COPY . /app

EXPOSE 3000

CMD ["node", "bin/www"]
