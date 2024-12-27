export const name = "restriction";

import { Block } from "../pixelwalker/components/structure.js";
import { CustomMap, hash4 } from "../pixelwalker/lib/custommap.js";
import { Rect } from "../pixelwalker/lib/rect.js";

export async function init(client, room, commands) {

	const restrictGodAreas = new CustomMap(hash4, (a, b) => a.equals(b));

	room.on("move", ({ player }) => {
		if (!player.god) return;

	});

	commands.add("restrictgod", "Restrict god in an area")
		.addArg(new CommandArgBool("restricted", "Whether to restrict this area", true))
		.addImpl(async (player, room, restricted) => {
			if (!player.owner) return;
			restricted = restricted ?? true;
			room.chat.whisper(player, `Select area to ${restricted ? "" : "un"}restrict god`);
			const sub = Rect.clone(await room.world.selectSub(player));
			// TODO subtract areas instead of just destroying them
			if (restricted) {
				restrictGodAreas.set(sub, true);
				room.world.setArea(sub.x1, sub.y1, sub.x2, sub.y2, Block.fromManager(client.blockManager, "checker_red_bg"))
				room.chat.send(`Added god restrict area from ${sub.x1}, ${sub.y1} to ${sub.x2}, ${sub.y2}`);
			} else {
				const dels = [];
				for (const area of restrictGodAreas.keys()) {
					if (area.intersects(sub))
						dels.push(area);
				}
				for (const area of dels) {
					room.chat.send(`Deleted god restrict area area from ${area.x1}, ${area.y1} to ${area.x2}, ${area.y2}`);
					restrictGodAreas.delete(area);
				}
			}
		});

}
