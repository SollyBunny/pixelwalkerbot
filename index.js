#!/bin/env node

import { Client } from "./pixelwalker/client.js";
import { Room } from "./pixelwalker/room.js";
import { Command, CommandArgString, CommandArgStringGreedy, CommandArgBool, CommandArgNumber, CommandArgChoice } from "./command.js";

import fs from "fs/promises"

const commands = {};

global.fs = fs;
global.Command = Command;
global.CommandArgString = CommandArgString;
global.CommandArgStringGreedy = CommandArgStringGreedy;
global.CommandArgBool = CommandArgBool;
global.CommandArgNumber = CommandArgNumber;
global.CommandArgChoice = CommandArgChoice;
global.commands = commands;
global.addCommand = (name, desc) => {
	if (commands[name])
		throw new Error(`Command ${name} already exists`);
	const command = new Command().addInfo(name, desc);
	commands[name] = command;
	return command;
};

const client = await Client.fromLogin(process.env.USER, process.env.PASS);
console.log("Connected client: " + client.id);
const room = await Room.fromId(client, process.env.ROOM);
console.log("Connected room: " + room.id);

global.client = client;
global.room = room;

room.on("close", ({ status, reason }) => {
	console.log(`WS Closed: ${status} ${reason}`);
	process.exit(1);
});

room.chat.on("chat", async ({ player, message }) => {
	if (player.id === room.players.self.id)
		return;
	if (!message.startsWith("!"))
		return;
	const index = message.indexOf(" ");
	const cmd = message.slice(1, index === -1 ? undefined : index).toLowerCase();
	const args = index === -1 ? "" : message.slice(index + 1);
	if (!commands[cmd]) {
		if (cmd.length && /^[a-z_!]+$/.test(cmd))
			room.chat.whisper(player, `No such command ${cmd}`);
		return;
	}
	try {
		await commands[cmd].exec(player, room, args);
	} catch (e) {
		room.chat.whisper(player, `Failed to run command ${cmd}`);
		room.chat.whisper(player, e.message);
		console.error(e);
	}
});

let cogs;
cogs = await fs.readdir("cogs");
cogs = cogs.map(cog => import(`./cogs/${cog}`));
await Promise.all(cogs);
