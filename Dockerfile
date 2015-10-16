FROM node:4.1-slim
MAINTAINER colab oratory

# the folder is called /vagrant for compatability with vagrant... should
# probably be called /oratory
RUN mkdir -p /vagrant/oratory/ /opt/node/lib/

WORKDIR /opt/node/lib/
ADD ./oratory/package.json /opt/node/lib/
RUN npm install && \
    npm install -g supervisor
ENV NODE_PATH /opt/node/lib/node_modules:$NODE_PATH

WORKDIR /vagrant/oratory/
EXPOSE 80
CMD touch users.js && supervisor server.js
