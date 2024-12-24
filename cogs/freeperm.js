
addCommand("freeedit", "Turn freeedit on or off")
	.addArg(new CommandArgBool("enabled", "Whether freeedit is enabled", true))
	.addImpl(async (player, room, enabled) => {
		room.freeEdit = enabled === undefined ? !room.freeEdit : enabled;
		room.chat.send(`Free Edit ${room.freeEdit ? "Enabled" : "Disabled"}`);
	});
