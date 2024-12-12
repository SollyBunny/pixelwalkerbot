
addCommand("ping", "Ping pong!")
	.addArg(new CommandArgStringGreedy("message", "Message to reply with", true))
	.addImpl(async (player, room, message) => {
		if (message)
			room.chat.send(`Pong: ${message}`);
		else
			room.chat.send("Pong");
	});