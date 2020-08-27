FROM node:12

ADD . /app
WORKDIR /app

RUN npm i
RUN npm run build

ENV PORT=80

EXPOSE 80
ENTRYPOINT ["npm", "start"]
