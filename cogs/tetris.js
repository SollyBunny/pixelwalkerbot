export const name = "tetris";

import { Bal } from "../pixelwalker/components/bal.js";
import { Block, LAYER_BACKGROUND, LAYER_COUNT, LAYER_FOREGROUND, Structure } from "../pixelwalker/components/structure.js";
import { Rect } from "../pixelwalker/lib/rect.js";

function Tetromino(lines, fgBlock, rotate) {
	const data = [];
	const scale = 1;
	for (const line of lines) {
		for (let _ = 0; _ < scale; ++_) {
			for (const block of line) {
				for (let __ = 0; __ < scale; ++__) {
					data.push(undefined);
					data.push(block ? fgBlock : undefined);
				}
			}
		}
	}
	const structure = new Structure(lines[0].length * scale, lines.length * scale, data);
	const out = [structure];
	for (let degrees = 1; degrees < 4; ++degrees) {
		out.push(structure.rotate(degrees));
	}
	return out;
}

class Tetris extends Bal {
	init() {
		this.world = this.room.world;
		this.rect = new Rect(
			Math.floor(this.world.width * 0.3), 67,
			Math.ceil(this.world.width * 0.7), this.world.height - 10
		);
		this.emptyBlock = new Block(0, LAYER_FOREGROUND);
		this.lavaBlock = Block.fromManager(this.client.blockManager, "liquid_lava");
		this.lavaBlocksBg = [
			Block.fromManager(this.client.blockManager, "lava_dark_red_bg"),
			Block.fromManager(this.client.blockManager, "lava_orange_bg"),
			Block.fromManager(this.client.blockManager, "lava_yellow_bg")
		];
		this.lavaBlockSurface = Block.fromManager(this.room.client.blockManager, "liquid_lava_surface");
		this.portalBlock = Block.fromManager(this.client.blockManager, "portal", { id: 1, to: 999, rotation: 1 });
		this.borderBlock = Block.fromManager(this.client.blockManager, "generic_black_transparent");
		this.initTetrominos();
		this.gameReset();
		this.timeout = setTimeout(this.tick.bind(this), 100);
		this.time = 0;
		this.waiting = 10;
		this.state = "Waiting";
	}
	deinit() {
		clearTimeout(this.timeout);
		this.timeout = undefined;
	}
	tick() {
		if (!this.enabled) return;
		this.update();
		this.time += 1;
		this.timeout = setTimeout(this.tick.bind(this), 400);
	}
	initTetrominos() {
		this.structures = [
			Tetromino([
				[1, 1],
				[1, 1]
			], Block.fromManager(this.client.blockManager, "beveled_yellow")),
			Tetromino([
				[1],
				[1],
				[1],
				[1],
			], Block.fromManager(this.client.blockManager, "beveled_cyan")),
			Tetromino([
				[0, 1, 1],
				[1, 1, 0],
			], Block.fromManager(this.client.blockManager, "beveled_red")),
			Tetromino([
				[1, 1, 0],
				[0, 1, 1],
			], Block.fromManager(this.client.blockManager, "beveled_green")),
			Tetromino([
				[1, 0],
				[1, 0],
				[1, 1],
			], Block.fromManager(this.client.blockManager, "beveled_blue")),
			Tetromino([
				[0, 1],
				[0, 1],
				[1, 1],
			], Block.fromManager(this.client.blockManager, "beveled_orange")),
			Tetromino([
				[0, 1, 0],
				[1, 1, 1],
			], Block.fromManager(this.client.blockManager, "beveled_magenta")),
		].flat();
	}
	update() {
		if (this.state === "On") {
			const players = [];
			for (const player of this.room.players) {
				if (player.id === this.room.players.self.id) continue;
				if (player.god) continue;
				if (player.afk) continue;
				players.push(player);
			}
			if (players.length >= 1) {
				for (const player of players)
					player.teleport(this.rect.x1 + (this.rect.x2 - this.rect.x1) / 2 - 2.5 + 5 * Math.random(), this.rect.y2 - 3);
				this.room.chat.send(`Starting with ${players.length} players`);
				this.gameReset();
				this.state = "Playing";
			} else if (this.time % 15 === 0) {
				this.room.chat.send("Waiting for players!");
			}
		} else if (this.state === "Playing") {
			let count = 0;
			for (const player of this.room.players) {
				if (player.id === this.room.players.self.id) continue;
				if (player.god) continue;
				if (player.afk) continue;
				if (this.rect.containsPoint(player.worldPosition))
					count += 1;
			}
			if (this.lavaLevel === this.rect.y1 + 50 && !this.suddenDeath) {
				this.suddenDeath = true;
				this.room.chat.send("Sudden death, game ending soon");
			}
			if (this.lavaLevel === this.rect.y1 + 20) {
				this.room.chat.send("Lava reached the top! GG");
				this.state = "Waiting";
				this.waiting = 5;
				this.gameReset();
			} else if (count === 0) {
				this.room.chat.send("No more players left! GG");
				this.state = "Waiting";
				this.waiting = 5;
				this.gameReset();
			} else {
				this.gameUpdate();
			}
		} else if (this.state === "Waiting") {
			this.waiting -= 1;
			if (this.waiting <= 0)
				this.state = "On";
		}
	}
	gameReset() {
		this.world.setAreaClearOutline(this.rect.x1, this.rect.y1, this.rect.x2, this.rect.y2, this.borderBlock);
		this.world.setArea(this.rect.x1 + 1, this.rect.y1 + 1, this.rect.x2 - 1, this.rect.y1 + 1, this.portalBlock);
		this.tetrominos = [];
		this.lavaLevel = this.rect.y2;
		this.collideLevel = this.rect.y2;
		this.initialBlocks = 100;
		this.suddenDeath = false;
	}
	gameUpdate() {
		this.tetrominos = this.tetrominos.filter(tetromino => tetromino.collided !== true);
		if (this.initialBlocks > 0) {
			this.addTetromino(true);
			this.initialBlocks -= 1;
		} else if (this.tetrominos.length < 100) {
			this.addTetromino();
		}
		const lavaLevelMelt = this.lavaLevel + 10;
		for (const tetromino of this.tetrominos) {
			if (tetromino.y + tetromino.structure.height >= lavaLevelMelt) {
				tetromino.collided = true;
				continue;
			}
			for (let x = 0; x < tetromino.structure.width; ++x) {
				if (!tetromino.structure.get(x, tetromino.structure.height - 1, LAYER_FOREGROUND))
					continue;
				const block = this.world.get(tetromino.x + x, tetromino.y + tetromino.structure.height, LAYER_FOREGROUND);
				if (block && !block.empty() && block.id !== this.lavaBlock.id && block.id !== this.lavaBlockSurface.id) {
					tetromino.collided = true;
					break;
				}
			}
			if (tetromino.collided) {
				if (tetromino.y + tetromino.structure.height < this.collideLevel)
					this.collideLevel = tetromino.y + tetromino.structure.height;
			} else {
				for (let x = tetromino.x; x <= tetromino.x + tetromino.structure.width - 1; ++x) for (let y = tetromino.y; y <= tetromino.y + tetromino.structure.height - 1; ++y) {
					let block;
					if (y === this.lavaLevel - 1)
						block = this.lavaBlockSurface;
					else if (y >= this.lavaLevel)
						block = this.lavaBlock;
					else
						block = this.emptyBlock;
					this.world.set(x, y, block);
				}
				tetromino.y += 1;
			}
			this.world.setSub(tetromino.x, tetromino.y, tetromino.structure);
		}
		if (this.lavaLevel > this.collideLevel + 5)
			this.increaseLavaLevel();
	}
	addTetromino(anywhere) {
		const structure = this.structures[Math.floor(Math.random() * this.structures.length)];
		const tetromino = {
			structure,
			x: this.rect.x1 + 1 + Math.round(Math.random() * (this.rect.x2 - this.rect.x1 - 1 - structure.width)),
			y: anywhere ? this.rect.y1 + 2 + Math.round(Math.random() * (this.rect.y2 - this.rect.y1 - 20)) : this.rect.y1 + 2 + Math.floor(Math.random() * 3)
		};
		for (let x = 0; x < tetromino.structure.width; ++x) for (let y = anywhere ? -3 : 0; y < tetromino.structure.height + 3; ++y) {
			const block = this.world.get(tetromino.x + x, tetromino.y + y, LAYER_FOREGROUND);
			if (block && !block.empty())
				return;
		}
		this.tetrominos.push(tetromino);
	}
	increaseLavaLevel() {
		this.lavaLevel -= 1;
		for (let x = this.rect.x1 + 1; x <= this.rect.x2 - 1; ++x) {
			let block;
			block = this.world.get(x, this.lavaLevel, LAYER_FOREGROUND);
			if (!block || block.empty() || block.id === this.lavaBlockSurface.id)
				this.world.set(x, this.lavaLevel, this.lavaBlock);
			this.world.set(x, this.lavaLevel, this.lavaBlocksBg[Math.floor(Math.random() * this.lavaBlocksBg.length)]);
			block = this.world.get(x, this.lavaLevel - 1, LAYER_FOREGROUND);
			if (!block || block.empty())
				this.world.set(x, this.lavaLevel - 1, this.lavaBlockSurface);
		}
		const lavaLevelMelt = this.lavaLevel + 10;
		if (lavaLevelMelt < this.rect.y2) {
			for (let x = this.rect.x1 + 1; x <= this.rect.x2 - 1; ++x) {
				let block = this.world.get(x, lavaLevelMelt, LAYER_FOREGROUND);
				if (block && !block.empty()) {
					block = Block.fromManager(this.client.blockManager, this.client.blockManager.name(block.id) + "_bg");
					if (block && !block.empty()) {
						this.world.set(x, lavaLevelMelt, block);
						this.world.set(x, lavaLevelMelt, new Block(0, LAYER_FOREGROUND));
					} else {
						this.world.set(x, lavaLevelMelt, this.lavaBlock);
					}
				} else {
					this.world.set(x, lavaLevelMelt, this.lavaBlock);
				}
			}
		}
	}
}

export async function init(client, room, commands) {

	const tetris = new Tetris(client, room);

	commands.add("tetris", "Enable tetris bal")
		.addArg(new CommandArgBool("enabled", "Whether tetris is enabled", false))
		.addImpl(async (player, room, enabled) => {
			tetris.enabled = enabled ?? !tetris.enabled;
			room.chat.send(`Tetris BAL ${tetris.enabled ? "Enabled" : "Disabled"}`);
		});

}
