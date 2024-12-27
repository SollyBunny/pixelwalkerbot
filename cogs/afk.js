export const name = "afk";

export async function init(client, room, commands) {

	commands.add("afk", "Set afk state")
		.addArg(new CommandArgBool("afk", "Afk state", true))
		.addImpl(async (player, room, afk) => {
			player.setAfk(afk ?? !player.afk);
		});

}
