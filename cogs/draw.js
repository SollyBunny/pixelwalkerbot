import { Block } from "../pixelwalker/components/structure.js";

addCommand("getpos", "Get position of a block")
	.addImpl(async (player, room) => {
		room.chat.whisper(player, "Place a basic white block to select position");
		const { x, y, layer, blockOld } = await room.world.select(undefined, player);
		room.chat.whisper(player, `Selected position ${x} ${y}`);
		room.world.set(x, y, layer, blockOld);
	});

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

addCommand("!copy", "Copy region")
	.addImpl(async (player, room) => {
		const { x1, y1, x2, y2 } = await room.world.selectSub(undefined, player);
		const structure = room.world.getSub(x1, y1, x2, y2).trim();
		if (structure.size === 0 || structure.empty())
			throw new Error("Region empty");
		const copyBuffer = new CopyBuffer(structure);
		copyBuffers.set(player, copyBuffer);
	});

addCommand("!cut", "Cut region")
	.addImpl(async (player, room) => {
		const { x1, y1, x2, y2 } = await room.world.selectSub(undefined, player);
		const structure = room.world.getSub(x1, y1, x2, y2).trim();
		if (structure.size === 0 || structure.empty())
			throw new Error("Region empty");
		const copyBuffer = new CopyBuffer(structure);
		copyBuffers.set(player, copyBuffer);
		for (let layer = 0; layer < 2; copyBuffer.structure.layers) {
			room.world.setArea(x1, y1, x2, y2, layer, new Block());
		}
	});

addCommand("!paste", "Paste copied region")
	.addImpl(async (player, room) => {
		const copyBuffer = copyBuffers.get(player);
		if (!copyBuffer) {
			room.chat.whisper(player, "No region copied");
			return;
		}
		room.chat.whisper(player, "Place a block to select position");
		const { x, y, layer, blockOld } = await room.world.select(undefined, player);
		room.world.set(x, y, layer, blockOld);
		copyBuffer.set(x, y, room.world);
	});

addCommand("!offset", "Offset copied region")
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

addCommand("!center", "Center copied region")
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

addCommand("!brush", "Use copied region as brush")
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
