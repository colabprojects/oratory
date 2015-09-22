# inventory
app for inventory - used to explore mongo and angularJS - initial setup for freedom foundation (land projects) database

## Quick Start

### Docker

0. Install [Docker](https://docs.docker.com/installation/)
1. Install [Docker Compose](https://docs.docker.com/compose/install/)
1. `git clone https://github.com/colabprojects/oratory`
2. `cd oratory`
3. `sudo docker-compose up`
    - Note: `docker-compose` probably doesn't need sudo as long as the docker
      install gave you permissions to mess with it.  If you weren't given
      permission by default, you can either a) run with sudo or b) add yourself
      to the `docker` group in `/etc/group`
4. wait...
5. Go to [http://localhost:55657](http://localhost:55657) in your browser


### Vagrant

0. Install [Vagrant](https://www.vagrantup.com/downloads.html)
1. `git clone https://github.com/colabprojects/oratory`
2. `cd oratory`
3. `vagrant up`
4. wait...
5. Go to [http://localhost:55657](http://localhost:55657) in your browser
