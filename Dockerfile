FROM node:22-alpine3.19

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

WORKDIR /app
RUN chown node:node ./

USER node

COPY package.json package-lock.json /app/

RUN npm ci && npm cache clean --force

COPY bin /app/bin
COPY public /app/public
COPY routes /app/routes
COPY views /app/views

COPY app.js /app/

EXPOSE 3000

CMD ["node", "bin/www"]
