socket.on('message', function(msg){
	$('#socket-messages').append('<p>'+msg+'</p>');
});