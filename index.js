#!/bin/env node

import { start } from "./bot.js";

globalThis.start = start;

if (typeof document === "undefined")
	start(process.env.USER, process.env.PASS, process.env.ROOM);
