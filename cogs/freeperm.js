export const name = "ping";

export async function init(client, room, commands) {

	room.players.on("join", ({ player }) => {
		if (room.freeEdit)
			room.players.setCanEdit(true);
		if (room.freeGod)
			room.players.setCanGod(true);
	});

	commands.add("freeedit", "Give everyone edit")
		.addArg(new CommandArgBool("enabled", "Whether freeedit is enabled", true))
		.addImpl(async (player, room, enabled) => {
			if (!player.owner) return;
			room.freeEdit = enabled === undefined ? !room.freeEdit : enabled;
			room.chat.send(`Free Edit ${room.freeEdit ? "Enabled" : "Disabled"}`);
			if (room.freeEdit)
				room.chat.send("/giveedit @a")
		});

	commands.add("freegod", "Give everyone god")
		.addArg(new CommandArgBool("enabled", "Whether freegod is enabled", true))
		.addImpl(async (player, room, enabled) => {
			if (!player.owner) return;
			room.freeGod = enabled === undefined ? !room.freeGod : enabled;
			room.chat.send(`Free God ${room.freeEdit ? "Enabled" : "Disabled"}`);
			if (room.freeGod)
				room.chat.send("/givegod @a");
		});

}
