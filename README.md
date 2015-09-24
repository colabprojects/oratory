# inventory
app for inventory - used to explore mongo and angularJS - initial setup for freedom foundation (land projects) database

## Quick Start

### Docker

0. Install Docker ([Linux](https://docs.docker.com/installation/), [Win/OSX](https://docker.com/toolbox/))
2. Open the docker terminal if you are on OSX or Win
1. `git clone https://github.com/colabprojects/oratory`
3. `cd oratory`
4. `docker-compose up -d`
    - Note: You may need to run `sudo docker-compose up` if your install didn't
      give you docker privileges.  If that's the case, you can either a) run
      with sudo or b) add yourself to the `docker` group in `/etc/group`
5. wait...
6. Go to [http://localhost:55657](http://localhost:55657) in your browser
    - Note: If you are on OSX or Win, it's probably on
      [http://192.168.99.100:55657](http://192.168.99.100:55657)


### Vagrant

0. Install [Vagrant](https://www.vagrantup.com/downloads.html)
1. `git clone https://github.com/colabprojects/oratory`
2. `cd oratory`
3. `vagrant up`
4. wait...
5. Go to [http://localhost:55657](http://localhost:55657) in your browser
