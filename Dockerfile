FROM node:20-alpine

ADD . /app
WORKDIR /app

RUN npm uninstall @elseu/sdu-react-scripts-eslint @elseu/sdu-react-scripts-prettier
RUN npm i && npm run build && npm cache clean --force && rm -rf node_modules
RUN npm pkg delete scripts.prepare
RUN npm i --production

ENV PORT=80

EXPOSE 80
ENTRYPOINT ["npm", "start"]
