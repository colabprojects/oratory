socket.on('message', function(msg){
	$('#socket-messages').append('<p>'+msg+'</p>');
});

socket.on('update', function(msg){
	$('#socket-messages').append('<p>'+msg+'</p>');
});
