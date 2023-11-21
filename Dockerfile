FROM node:18-alpine
ARG NPM_TOKEN

ADD . /app
WORKDIR /app

RUN echo "//npm.pkg.github.com/:_authToken=$NPM_TOKEN" >> .npmrc && \
    npm config set @elseu:registry https://npm.pkg.github.com/ && \ 
    npm i && npm run build && npm cache clean --force && rm -rf node_modules && \
    rm -f .npmrc

RUN npm i --production

ENV PORT=80

EXPOSE 80
ENTRYPOINT ["npm", "start"]
