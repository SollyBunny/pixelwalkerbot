export const name = "ping";

export async function init(client, room, commands) {

	commands.add("ping", "Ping pong!")
		.addArg(new CommandArgStringGreedy("message", "Message to reply with", true))
		.addImpl(async (player, room, message) => {
			if (message)
				room.chat.send(`Pong: ${message}`);
			else
				room.chat.send("Pong");
		});

}
