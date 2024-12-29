import { Client } from "./pixelwalker/client.js";
import { Room } from "./pixelwalker/room.js";
import { Commands, CommandArgString, CommandArgStringGreedy, CommandArgBool, CommandArgNumber, CommandArgChoice } from "./command.js";

globalThis.CommandArgString = CommandArgString;
globalThis.CommandArgStringGreedy = CommandArgStringGreedy;
globalThis.CommandArgBool = CommandArgBool;
globalThis.CommandArgNumber = CommandArgNumber;
globalThis.CommandArgChoice = CommandArgChoice;

const cogNames = ["draw", "ping", "switch", "snake", "freeperm", "afk", "tetris"];
const cogs = await Promise.all(cogNames.map(async name => {
	const cog = await import(`./cogs/${name}.js`);
	if (!cog.name)
		throw `Cog ${name} is missing name`;
	if (!cog.init)
		throw `Cog ${name} is missing init`;
	return cog;
}));

export async function createClient(USER, PASS) {
	const client = new Client();
	await Promise.all([
		client.init(),
		client.authWithCredentials(USER, PASS)
	]);
	return client;
}

export async function joinRoom(client, ROOM) {
	const room = new Room(client);
	await room.connect(ROOM);

	const commands = new Commands();
	await Promise.all(cogs.map(async cog => {
		try {
			await cog.init(client, room, commands);
		} catch (e) {
			console.error(`In cog ${cog.name}`);
			throw e;
		}
	}));

	room.chat.on("chat", async ({ player, message }) => {
		if (!message.startsWith("!"))
			return;
		try {
			await commands.exec(player, room, message.slice(1));
		} catch (error) {
			if (error instanceof Error) {
				room.chat.whisper(player, error.message);
				console.error(error);
			} else {
				room.chat.whisper(player, error);
			}
		}
	});

	return { client, room, commands };
}