FROM node:8-alpine

# Create app directory
RUN mkdir -p /usr/src/secrets

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY . /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY secrets/*.json /usr/src/secrets/
COPY index.js .


#CMD [ "node", "index.js" ]