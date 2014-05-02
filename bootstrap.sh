#!/bin/bash

echo Provisioning system...

echo Installing prereq packages...
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y python-software-properties vim

# Nodejs
wget http://nodejs.org/dist/v0.10.26/node-v0.10.26-linux-x64.tar.gz
tar xzvf node-v0.10.26-linux-x64.tar.gz
mv node-v0.10.26-linux-x64 /opt/node
echo 'PATH="$PATH:/opt/node/bin"' > /etc/profile.d/nodepath.sh
echo 'export PATH' >> /etc/profile.d/nodepath.sh
source /etc/profile.d/nodepath.sh

cd /vagrant
/opt/node/bin/npm install

chmod a+x /vagrant/webserver.sh
ln -s /vagrant/webserver.sh /etc/init.d/webserver
update-rc.d webserver defaults
service webserver start

#more node stuff
sudo apt-get install make

# Mongo
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | sudo tee /etc/apt/sources.list.d/mongodb.list
sudo apt-get update
sudo apt-get install mongodb-10gen

#import
#rsync -avh -e "ssh -p 4242 -i /vagrant/micha_server_key" hein@lor4x.no-ip.org:~/mongo_backup /vagrant/mongoimport/
#mongoimport --db rsvpdb --collection rsvpdb --dbpath /vagrant/mongoimport/mongo_backup/rsvpdb

#set up cron jobs
#echo "* */1 * * * bash /vagrant/backup.sh" > /etc/cron.d/db_backup

echo "The main site can be accessed through http://localhost:55656"

