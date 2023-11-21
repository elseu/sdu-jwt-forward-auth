FROM node:18-alpine

ADD . /app
WORKDIR /app

RUN npm uninstall @elseu/sdu-react-scripts-eslint
RUN npm i && npm run build && npm cache clean --force && rm -rf node_modules
RUN npm i --production

ENV PORT=80

EXPOSE 80
ENTRYPOINT ["npm", "start"]
