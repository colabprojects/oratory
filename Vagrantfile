# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
	config.vm.define "dockerless", autostart: false do |old|
		old.vm.box = "ubuntu/trusty64"
		
		old.vm.network :forwarded_port, guest: 80, host: 55657
		old.vm.network :forwarded_port, guest: 25, host: 55525
		old.vm.network :forwarded_port, guest: 465, host: 55465
		#[WHY?] 1. Forward port 80 to host the static files on port 55656 (656 fairview school lane)
		#       2. I am using 55,000's because Justin is amazing (also i think it is because high numbers won't fuck with your computer's goings-ons)
		#       3. The forwarding of ports 25 and 465 is for mail (need a way for the smtp server to talk to the virtual machine)


		#[REMEMBER] sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 465 -j REDIRECT --to-port 55465
		
		# Run provisioning scripts
		old.vm.provision :shell, :path => "bootstrap.sh"
	end

	config.vm.define "web" do |web|
		web.vm.synced_folder ".", "/vagrant", disabled: true
		web.vm.synced_folder "./oratory", "/vagrant/oratory"
		web.vm.provider "docker" do |docker|
			docker.name = "web"
			docker.build_dir = "."
			docker.link("db:db")
			docker.ports = ["55657:80"]
		end
	end

	config.vm.define "db" do |db|
		db.vm.synced_folder ".", "/vagrant", disabled: true
		db.vm.provider "docker" do |docker|
			docker.name = "db"
			docker.image = "mongo:latest"
		end
	end
end
