FROM node:4.1
MAINTAINER colab oratory

# the folder is called /vagrant for compatability with vagrant... should
# probably be called /oratory
RUN mkdir /vagrant
WORKDIR /vagrant
ADD ./oratory/package.json /vagrant/

RUN npm install && \
    npm install -g forever

EXPOSE 80

