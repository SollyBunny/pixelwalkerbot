export const name = "switch";

export async function init(client, room, commands) {

	commands.add("switch", "Turn a switch on or off")
		.addArg(new CommandArgNumber("id", "Id to switch (-1 for all)", false, -1, 999, 1))
		.addArg(new CommandArgBool("state", "State for switch (empty for toggle)", true))
		.addImpl(async (player, room, id, enabled) => {
			if (!player.canEdit)
				return;
			room.world.globalSwitch(id, enabled);
		});

}
