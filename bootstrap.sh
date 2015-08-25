#!/bin/bash
cd /vagrant
echo Provisioning system...
echo Installing prereq packages...
export DEBIAN_FRONTEND=noninteractive
# Mongo
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
sudo apt-get update
sudo apt-get install -y python-software-properties gcc make build-essential mongodb-10gen imagemagick

# Forget about apt packages for node, just grab a local copy of node
nodeVersion=0.12.7
downloadDir=/opt/download
sudo mkdir -p $downloadDir

nodeName=node-v$nodeVersion-linux-x64
nodeGz=$nodeName.tar.gz
nodeUrl=http://nodejs.org/dist/v$nodeVersion/$nodeGz
nodeDl=$downloadDir/$nodeGz

if [ ! -f $nodeDl ]; then
	echo Downloading $nodeUrl to $nodeDl
	sudo curl -o $nodeDl $nodeUrl
fi

nodeDir=$downloadDir/$nodeName
nodeCmd=$nodeDir/bin/node
npmCmd=$nodeDir/bin/npm
if [ ! -f $npmCmd ]; then
	echo Extracting node gz
	sudo tar xzf $nodeDl -C $downloadDir
fi

sudo ln -s $nodeCmd /usr/bin/node
sudo ln -s $npmCmd /usr/bin/npm

npm install

iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 465 -j REDIRECT --to-port 55465

#start the forever server
sudo npm install -g forever
touch users.js # this file must exist, but isn't checked in
sudo forever start server.js

echo app is running on localhost:55657
