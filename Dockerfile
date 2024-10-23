    # ./set-docker-vars.sh
    # docker run --env-file ./env.list -t -i -p 8080:8080 services-dashboard-web

FROM node:20

EXPOSE 8080

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install \
    npm i --save-dev @types/express

COPY tsconfig.json ./

COPY src ./src
COPY public ./public
COPY views ./views
COPY .env ./

RUN npx tsc

CMD ["node", "dist/app.js"]
