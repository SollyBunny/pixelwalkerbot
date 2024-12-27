export const name = "draw";

import { Block, LAYER_BACKGROUND, LAYER_COUNT, Structure } from "../pixelwalker/components/structure.js";
import { Rect } from "../pixelwalker/lib/rect.js";
import { Room } from "../pixelwalker/room.js";

let fs;
if (typeof document === "undefined")
	fs = await import("fs/promises");

async function getFile(path) {
	if (fs === undefined)
		return (await fetch("./logo.png")).arrayBuffer();
	else
		return await fs.readFile(path);
}

class CopyBuffer {
	constructor(structure) {
		this.structure = structure.trim();
		this.offset = { x: 0, y: 0 };
		this.centered = false;
		this.brushed = false;
	}
	set(x, y, world) {
		x += this.offset.x;
		x += this.offset.y;
		if (this.centered) {
			x -= Math.round(this.structure.width / 2);
			y -= Math.round(this.structure.height / 2);
		}
		world.setSub(x, y, this.structure);
	}
	center(enabled) {
		this.centered = enabled === undefined ? !this.centered : enabled;
	}
	brush(enabled) {
		this.brushed = enabled === undefined ? !this.brushed : enabled;
	}
	offset(x, y) {
		this.offset.x += x;
		this.offset.y += y;
	}
}

export async function init(client, room, commands) {

	const copyBuffers = new Map();
	room.players.on("leave", ({ player }) => {
		copyBuffers.delete(player);
	});
	room.world.on("blockPlaced", ({ player, block, x, y }) => {
		if (block.empty()) return;
		const copyBuffer = copyBuffers.get(player);
		if (!copyBuffer) return;
		if (!copyBuffer.brushed) return;
		copyBuffer.set(x, y, room.world);
	});

	commands.add("inspect", "Inpsect block")
		.addImpl(async (player, room) => {
			room.chat.whisper(player, "Place a block to select position");
			const { x, y, blockOld: block } = await room.world.select(player);
			room.chat.whisper(player, `Selected position ${x}, ${y}`);
			room.chat.whisper(player, `${client.blockManager.name(block.id)} (${block.id})`);
			if (block.properties) {
				for (const [name, value] of Object.entries(block.properties))
					room.chat.whisper(player, `${name}: ${value}`);
			}
		});

	commands.add("!copy", "Copy region")
		.addImpl(async (player, room) => {
			const { x1, y1, x2, y2 } = await room.world.selectSub(player);
			const structure = room.world.getSub(x1, y1, x2, y2).trim();
			if (structure.size === 0 || structure.empty())
				throw new Error("Region empty");
			const copyBuffer = new CopyBuffer(structure);
			copyBuffers.set(player, copyBuffer);
		});

	commands.add("!cut", "Cut region")
		.addImpl(async (player, room) => {
			const { x1, y1, x2, y2 } = await room.world.selectSub(player);
			const structure = room.world.getSub(x1, y1, x2, y2).trim();
			if (structure.size === 0 || structure.empty())
				throw new Error("Region empty");
			const copyBuffer = new CopyBuffer(structure);
			copyBuffers.set(player, copyBuffer);
			for (let layer = 0; layer < LAYER_COUNT; ++layer)
				room.world.setArea(x1, y1, x2, y2, new Block(0, layer));
		});

	commands.add("!paste", "Paste copied region")
		.addImpl(async (player, room) => {
			const copyBuffer = copyBuffers.get(player);
			if (!copyBuffer) {
				room.chat.whisper(player, "No region copied");
				return;
			}
			room.chat.whisper(player, "Select paste position");
			const { x, y } = await room.world.select(player);
			copyBuffer.set(x, y, room.world);
			room.chat.whisper(player, `Pasted at ${x}, ${y}`);
		});

	commands.add("!offset", "Offset copied region")
		.addArg(new CommandArgNumber("x", "X Offset", false, undefined, undefined, 1))
		.addArg(new CommandArgNumber("y", "Y Offset", false, undefined, undefined, 1))
		.addImpl(async (player, room, x, y) => {
			const copyBuffer = copyBuffers.get(player);
			if (!copyBuffer) {
				room.chat.whisper(player, "No region copied");
				return;
			}
			copyBuffer.offset(x, y);
			room.chat.whisper(player, `Offset set to ${copyBuffer.offset.x}, ${copyBuffer.offset.y}`);
		});

	commands.add("!center", "Center copied region")
		.addArg(new CommandArgBool("enabled", "Whether to center copied region", true))
		.addImpl(async (player, room, enabled) => {
			const copyBuffer = copyBuffers.get(player);
			if (!copyBuffer) {
				room.chat.whisper(player, "No region copied");
				return;
			}
			copyBuffer.center(enabled);
			room.chat.whisper(player, `Center ${copyBuffer.centered ? "enabled" : "disabled"}`);
		});

	commands.add("!brush", "Use copied region as brush")
		.addArg(new CommandArgBool("enabled", "Whether to use copied region as brush", true))
		.addImpl(async (player, room, enabled) => {
			const copyBuffer = copyBuffers.get(player);
			if (!copyBuffer) {
				room.chat.whisper(player, "No region copied");
				return;
			}
			copyBuffer.brush(enabled);
			room.chat.whisper(player, `Brush ${copyBuffer.brushed ? "enabled" : "disabled"}`);
		});

	commands.add("logo", "Draw the pixelwalker logo")
		.addArg(new CommandArgNumber("Max size", "Max width or height to draw", true, 5, () => Math.max(room.world.width, room.world.height), 1))
		.addImpl(async (player, room, maxsize, bg) => {
			bg = bg ?? false;
			room.chat.whisper(player, "Select logo position");
			maxsize = maxsize ?? 50;
			const { x, y } = await room.world.select(player);
			const structure = await Structure.fromImage(
				await getFile("./tetris.png"),
				maxsize, room.client.blockManager,
				room.client.blockColors
			);
			room.chat.whisper(player, `Drawing logo at ${x}, ${y}. Max size is ${maxsize}`)
			room.world.setSub(x, y, structure);
		});

	commands.add("pastefromworld", "Copy a section from a world")
		.addArg(new CommandArgString("id", "World Id", false))
		.addArg(new CommandArgNumber("x1", "x1", true, 0, undefined, 1))
		.addArg(new CommandArgNumber("y1", "y1", true, 0, undefined, 1))
		.addArg(new CommandArgNumber("x2", "x2", true, 0, undefined, 1))
		.addArg(new CommandArgNumber("y2", "y2", true, 0, undefined, 1))
		.addImpl(async (player, room, id, x1, y1, x2, y2) => {
			if (!player.owner) return;
			room.chat.whisper(player, `Getting data from ${id}`);
			const roomNew = new Room(client);
			await roomNew.connect(id);
			const rect = new Rect(x1, y1, x2 ?? room.world.width, y2 ?? room.world.height);
			const structure = roomNew.world.getSub(rect.x1, rect.y1, rect.x2, rect.y2);
			roomNew.close("Finished getting sub structure");
			room.chat.whisper(player, "Select position to put structure");
			const { x, y } = await room.world.select(player);
			room.world.setSub(x, y, structure);
			room.chat.whisper(player, `Pasted at ${x}, ${y}`);
		});

}
