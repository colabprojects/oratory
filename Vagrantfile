# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
	config.vm.box = "precise64"

	# The url from where the 'config.vm.box' box will be fetched if it
	# doesn't already exist on the user's system.
	config.vm.box_url = "http://files.vagrantup.com/precise64.box"

	# Create a forwarded port mapping which allows access to a specific port
	# within the machine from a port on the host machine. In the example below,
	# accessing "localhost:8080" will access port 80 on the guest machine.
	config.vm.network :forwarded_port, guest: 80, host: 55656
	config.vm.network :forwarded_port, guest: 25, host: 55525
	config.vm.network :forwarded_port, guest: 465, host: 55465


	#[WHY?] 1. Forward port 80 to host the static files on port 55656 (656 fairview school lane)
	#       2. I am using 55,000's because Justin is amazing (also i think it is because high numbers won't fuck with your computer's goings-ons)
	#       3. The forwarding of ports 25 and 465 is for mail (need a way for the smtp server to talk to the virtual machine)


	#[REMEMBER] sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 465 -j REDIRECT --to-port 55465

	# Create a public network, which generally matched to bridged network.
	# Bridged networks make the machine appear as another physical device on
	# your network.
	# config.vm.network :public_network

	# Run provisioning scripts
	config.vm.provision :shell, :path => "bootstrap.sh"
end
