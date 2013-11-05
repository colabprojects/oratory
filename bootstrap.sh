#!/bin/bash

echo Provisioning system...

echo Installing prereq packages...
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y python-software-properties
add-apt-repository -y ppa:nilya/couchdb-1.3
apt-get update
apt-get install -y apache2 vim couchdb

rm -rf /var/www
ln -fs /vagrant/www /var/www

echo "[httpd]" > /etc/couchdb/local.ini
echo "bind_address = 0.0.0.0" >> /etc/couchdb/local.ini
echo "enable_cors = true" >> /etc/couchdb/local.ini
echo "[cors]" >> /etc/couchdb/local.ini
echo "origins = *" >> /etc/couchdb/local.ini

service couchdb stop
killall couchdb
killall beam.smp
service couchdb start

echo "The main site can be accessed through http://localhost:55555. To test the authentication server, you must modify your hosts file. This can be done through Fiddler (Tools::HOST...) add an entry like the following:"
echo "localhost:55555 inventory.com"
echo ""
echo "couch db 5984 -> 55559"
