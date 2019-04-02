FROM node:8-alpine

# Create app directory
RUN mkdir -p /usr/src/secrets

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app
RUN npm install

# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY secrets/*.json /usr/src/secrets/
COPY config.json /usr/src/app
COPY index.js /usr/src/app

CMD [ "node", "index.js" ]