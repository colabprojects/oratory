FROM node:4.1
MAINTAINER colab oratory

# the folder is called /vagrant for compatability with vagrant... should
# probably be called /oratory
RUN mkdir -p /vagrant/oratory/
WORKDIR /vagrant/oratory/
ADD ./oratory/package.json /vagrant/oratory/

RUN npm install -g && \
    npm install -g forever

EXPOSE 80

