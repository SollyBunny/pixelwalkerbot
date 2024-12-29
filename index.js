#!/bin/env node

import { createClient, joinRoom } from "./bot.js";

globalThis.createClient = createClient;
globalThis.joinRoom = joinRoom;

if (typeof document === "undefined") {

	const client = await createClient(process.env.USER, process.env.PASS);
	console.log("Connected client: " + client.id);
	const { room, commands } = await joinRoom(client, process.env.ROOM);
	console.log("Connected to room: " + room.id);
	room.on("close", reason => {
		console.log(`Closed: ${reason}`);
		// setTimeout(() => room.reconnect(), 1000);
	});

	async function say(message) {
		if (message.startsWith("!")) {
			try {
				await commands.exec(room.players.self, room, message.slice(1));
			} catch (error) {
				if (error instanceof Error) {
					console.error(error);
				} else {
					console.log(error);
				}
			}
		} else {
			room.chat.send(message);
		}
	}

	room.chat.on("chat", ({ player, message}) => {
		console.log(`${player.username}: ${message}`);
	});
	global.say = say;

	const repl = (await import("repl")).start("> ");
	// Define the autocomplete function
	repl.on("SIGINT", () => {
		repl.close();
	});

}
