import { Client } from "./pixelwalker/client.js";
import { Room } from "./pixelwalker/room.js";
import { Commands, CommandArgString, CommandArgStringGreedy, CommandArgBool, CommandArgNumber, CommandArgChoice } from "./command.js";

globalThis.CommandArgString = CommandArgString;
globalThis.CommandArgStringGreedy = CommandArgStringGreedy;
globalThis.CommandArgBool = CommandArgBool;
globalThis.CommandArgNumber = CommandArgNumber;
globalThis.CommandArgChoice = CommandArgChoice;

const cogNames = ["draw", "ping", "switch", "snake"];
const cogs = await Promise.all(cogNames.map(async name => {
	const cog = await import(`./cogs/${name}.js`);
	if (!cog.name)
		throw `Cog ${name} is missing name`;
	if (!cog.init)
		throw `Cog ${name} is missing init`;
	return cog;
}));

export async function start(USER, PASS, ROOM) {
	
	const client = await Client.fromLogin(USER, PASS);
	console.log("Connected client: " + client.id);
	const room = await Room.fromId(client, ROOM);
	console.log("Connected room: " + room.id);
	
	const commands = new Commands();
	await Promise.all(cogs.map(async cog => {
		try {
			await cog.init(client, room, commands);
		} catch (e) {
			console.error(`In cog ${cog.name}`);
			throw e;
		}
	}));
	console.log("Loaded all cogs");

	room.on("close", reason => {
		console.log(`Closed: ${reason}`);
		// setTimeout(() => room.reconnect(), 1000);
	});

	room.chat.on("chat", async ({ player, message }) => {
		if (player.id === room.players.self.id)
			return;
		if (!message.startsWith("!"))
			return;
		const index = message.indexOf(" ");
		const cmd = message.slice(1, index === -1 ? undefined : index).toLowerCase();
		const args = index === -1 ? "" : message.slice(index + 1);
		if (!commands.commands[cmd]) {
			if (cmd.length && /^[a-z_!]+$/.test(cmd))
				room.chat.whisper(player, `No such command ${cmd}`);
			return;
		}
		try {
			await commands.commands[cmd].exec(player, room, args);
		} catch (e) {
			room.chat.whisper(player, `Failed to run command ${cmd}`);
			room.chat.whisper(player, e.message);
			console.error(e);
		}
	});

	return { client, room, commands };

}