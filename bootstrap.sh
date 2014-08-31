#!/bin/bash

echo Provisioning system...

echo Installing prereq packages...
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y python-software-properties npm

# Nodejs
wget http://nodejs.org/dist/v0.10.26/node-v0.10.26-linux-x64.tar.gz
tar xzvf node-v0.10.26-linux-x64.tar.gz
mv node-v0.10.26-linux-x64 /opt/node
echo 'PATH="$PATH:/opt/node/bin"' > /etc/profile.d/nodepath.sh
echo 'export PATH' >> /etc/profile.d/nodepath.sh
source /etc/profile.d/nodepath.sh

chmod a+x /vagrant/webserver.sh
ln -s /vagrant/webserver.sh /etc/init.d/webserver
update-rc.d webserver defaults
service webserver start

# Mongo
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
sudo apt-get update
sudo apt-get install mongodb-10gen


cd /vagrant
npm config set registry http://registry.npmjs.org/
sudo apt-get -y install gcc make build-essential
sudo add-apt-repository -y ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get -y install nodejs
sudo npm install
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 465 -j REDIRECT --to-port 55465
sudo npm update

#need this for the image manipulation (subclass of the npm module, gm)
sudo apt-get install imagemagick

echo DO THIS: cd /vagrant sudo node server.js
echo app is running on localhost:55656