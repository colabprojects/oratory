FROM node:4.1-slim
MAINTAINER colab oratory

# the folder is called /vagrant for compatability with vagrant... should
# probably be called /oratory
RUN mkdir -p /vagrant/oratory/ /vagrant/lib

WORKDIR /vagrant/lib/
ADD ./oratory/package.json /vagrant/lib/
RUN npm install && \
    npm install -g supervisor
ENV NODE_PATH /vagrant/lib/node_modules:$NODE_PATH

WORKDIR /vagrant/oratory/
EXPOSE 80

