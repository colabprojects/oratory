#!/bin/bash

### BEGIN INIT INFO
# Provides:		webserver
# Required-Start:	$remote_fs $syslog
# Required-Stop:	$remote_fs $syslog
# Default-Start:	2 3 4 5
# Default-Stop:		0 1 6
# Short-Description:	The webserver server
### END INIT INFO

# Copy (or link) this shell script to /etc/init.d to use it as a service
# Be sure to make it executable `chmod a+x`
# Then `sudo updaterc.d webserver defaults` to set it up to run on boot
# You may need to edit the paths below to match your system
NODE_PATH=/opt/node/bin/node
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
	DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
	SOURCE="$(readlink "$SOURCE")"
	[[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
SCRIPT_DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
echo $SCRIPT_DIR

DAEMON_PATH="$SCRIPT_DIR"
DAEMON="$NODE_PATH"
DAEMONOPTS="$SCRIPT_DIR/server.js"

NAME=webserver
DESC="The webserver"
PIDFILE=/var/run/$NAME.pid
SCRIPTNAME=/etc/init.d/$NAME

case "$1" in
	start)
		printf "%-50s" "Starting $NAME..."
		cd $DAEMON_PATH
		PID=`$DAEMON $DAEMONOPTS > /dev/null 2>&1 & echo $!`
		#echo "Saving PID" $PID " to " $PIDFILE
		if [ -z $PID ]; then
			printf "%s\n" "Fail"
		else
			echo $PID > $PIDFILE
			printf "%s\n" "Ok"
		fi
		;;
	status)
		printf "%-50s" "Checking $NAME..."
		if [ -f $PIDFILE ]; then
			PID=`cat $PIDFILE`
			if [ -z "`ps axf | grep ${PID} | grep -v grep`" ]; then
				printf "%s\n" "Process dead but pidfile exists"
			else
				echo "Running"
			fi
		else
			printf "%s\n" "Service not running"
		fi
		;;
	stop)
		printf "%-50s" "Stopping $NAME"
		PID=`cat $PIDFILE`
		cd $DAEMON_PATH
		if [ -f $PIDFILE ]; then
			kill $PID
			printf "%s\n" "Ok"
			rm -f $PIDFILE
		else
			printf "%s\n" "pidfile not found"
		fi
		;;

	restart)
		$0 stop
		$0 start
		;;

	*)
		echo "Usage: $0 {status|start|stop|restart}"
		exit 1
esac
