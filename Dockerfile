FROM node:12

ADD . /app
WORKDIR /app

RUN npm i && npm run build && rm -rf node_modules
RUN npm i --production

ENV PORT=80

EXPOSE 80
ENTRYPOINT ["npm", "start"]
