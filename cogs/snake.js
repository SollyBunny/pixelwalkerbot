import { Block, LAYER_FOREGROUND } from "../pixelwalker/components/structure.js";

export const name = "decay";

const snakes = {};
snakes["checker"] = snakes["beveled"] = snakes["basic"] = ["red", "orange", "yellow", "green", "cyan", "blue", "magenta"];
snakes["glass"] = snakes["minerals"] = snakes["tiles"] = ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "magenta"];
snakes["plastic"] = ["red", "orange", "yellow", "lime", "green", "cyan", "blue", "magenta"];
snakes["brick"] = ["red", "brown", "olive", "green", "teal", "blue", "purple"];
snakes["jungle"] = ["red", "blue", "olive"];
snakes["christmas_gift_full"] = ["red", "yellow", "green", "blue"];
snakes["canvas"] = snakes["outerspace"] = ["red", "blue", "green"];
snakes["scifi_panel"] = ["red", "yellow", "green", "cyan", "blue", "magenta"];
snakes["gemstone"] = ["red", "yellow", "green", "cyan", "blue", "purple"];

function muxInt16(high, low) {
	return (high << 16) | low;
}

export async function init(client, room, commands) {

	const snakeNexts = new Map();
	for (const [prefix, snake] of Object.entries(snakes)) {
		let blockLast = new Block(0, LAYER_FOREGROUND);
		for (const part of snake) {
			const blockThis = Block.fromManager(client.blockManager, `${prefix}_${part}`);
			if (blockThis === undefined || blockThis.empty())
				continue;
			snakeNexts.set(blockThis.id, blockLast);
			blockLast = blockThis;
		}
	}

	const snakeBlocks = new Map();
	const snakePlayers = new Map();
	room.players.on("leave", ({ player }) => {
		snakePlayers.delete(player);
	});
	room.world.on("blockPlacedGroup", ({ player, block, positions }) => {
		if (block.empty()) return;
		const snakeNext = snakeNexts.get(block.id);
		if (snakeNext === undefined)
			return;
		for (const { x, y } of positions) {
			const hash = muxInt16(x, y);
			const timeout = snakeBlocks.get(hash);
			if (timeout) {
				clearTimeout(timeout);
				snakeBlocks.delete(hash);
			}
			if (player.id === room.players.self.id ? timeout === undefined : !snakePlayers.get(player))
				continue;
			snakeBlocks.set(hash, setTimeout(() => {
				room.world.set(x, y, snakeNext);
			}, 400));
		}
	});

	commands.add("snake", "Place any colorful block and watch it slowly go down the rainbow")
		.addArg(new CommandArgBool("enable", "Whether to enable snake", true))
		.addImpl(async (player, room, enabled) => {
			if (enabled === undefined)
				enabled = !snakePlayers.get(player);
			snakePlayers.set(player, enabled);
			room.chat.whisper(player, `Snake ${enabled ? "enabled" : "disabled"}`);
		});

}
