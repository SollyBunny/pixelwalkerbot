
function parseArgs(string) {
	return (string.match(/"(\\"|.)*?"|'(\\'|.)*?'|\S+/g) ?? [])
		.map(i => i.replace(/^["']+|(?<!\\)["']+$/g, ""));
}

class CommandArg {
	constructor(name, desc, optional) {
		this.name = name.toLowerCase();
		this.desc = desc;
		this.optional = optional ?? false;
	}
}

export class CommandArgString extends CommandArg {
	constructor(name, desc, optional, min, max) {
		super(name, desc, optional);
		this._min = min;
		this._max = max;
	}
	get min() {
		if (typeof(this._min) === "function")
			return this._min();
		return this._min;
	}
	get max() {
		if (typeof(this._max) === "function")
			return this._max();
		return this._max;
	}
	parse(string) {
		if (this.min !== undefined && string.length < this.min)
			throw new Error(`Must be at least ${this.min} characters`);
		if (this.max !== undefined && string.length > this.max)
			throw new Error(`Must be at most ${this.max} characters`);
		return string;
	}
}

export class CommandArgStringGreedy extends CommandArgString {
	constructor(name, desc, optional, min, max) {
		super(name, desc, optional, min, max);
		this.greedy = true;
	}
}

export class CommandArgBool extends CommandArg {
	constructor(name, desc, optional) {
		super(name, desc, optional);
	}
	help() {
		return `${this.name}: ${this.desc} (boolean: 1/0, yes/no, true/false)`;
	}
	parse(string) {
		if (/^\d+$/.test(string))
			return Number(string) > 0
		string = string.toLowerCase();
		if (string === "yes" || string === "true")
			return true;
		if (string === "no" || string === "false")
			return false;
		throw new Error("Must be a boolean");
	}
}

export class CommandArgNumber extends CommandArg {
	constructor(name, desc, optional, min, max, step) {
		super(name, desc, optional);
		this._min = min;
		this._max = max;
		this._step = step;
	}
	get min() {
		if (typeof(this._min) === "function")
			return this._min();
		return this._min;
	}
	get max() {
		if (typeof(this._max) === "function")
			return this._max();
		return this._max;
	}
	get step() {
		if (typeof(this._step) === "function")
			return this._step();
		return this._step;
	}
	help() {
		return `${this.name}: ${this.desc} (number${this.min ? ` min: ${this.min}` : ""}${this.max ? ` max: ${this.max}` : ""}${this.step ? ` step: ${this.step}` : ""})`;
	}
	parse(string) {
		string = Number(string);
		if (isNaN(string))
			throw new Error("Must be a number");
		if (this.min !== undefined && string < this.min)
			throw new Error(`Must be above ${this.min}`);
		if (this.max !== undefined && string > this.max)
			throw new Error(`Must be below ${this.max}`);
		if (this.step !== undefined && string % this.step > 0.005)
			throw new Error(`Must be a multiple of ${this.step}`);
		return string;
	}
}

export class CommandArgChoice extends CommandArg {
	constructor(name, desc, optional, choices, lower) {
		super(name, desc, optional);
		this._choices = choices;
		this._lower = lower;
	}
	get choices() {
		if (typeof(this._choices) === "function")
			return this._choices();
		return this._choices;
	}
	get lower() {
		if (typeof(this._lower) === "function")
			return this._lower();
		return this._lower;
	}
	help() {
		return `${this.name}: ${this.desc} (choices: ${this.choices.join(", ")})`;
	}
	parse(string) {
		if (this.lower)
			string = string.toLowerCase();
		if (!this.choices.includes(string))
			throw new Error(`Must be one of ${this.choices.join(", ")}`);
		return string;
	}
}

export class Command {
	constructor() {
		this.restrictions = [];
		this.args = [];
	}
	help() {
		return `${this.name}: ${this.desc}`;
	}
	helpEx() {
		const args = this.args.map(arg => arg.help()).join("\n\t");
		return `${this.name}: ${this.desc}` + args.length ? `\n\t${args}` : "";
	}
	addInfo(name, desc) {
		this.name = name.toLowerCase();
		this.desc = desc;
		return this;
	}
	addArg(arg) {
		if (this.args.length && this.args.at(-1).greedy)
			throw new Error("Cannot add argument after greedy argument");
		this.args.push(arg);
		return this;
	}
	addImpl(func) {
		this.func = func;
		return this;
	}
	addRestriction(func) {
		this.restrictions.push(func);
		return this;
	}
	async exec(player, room, string) {
		if (!this.func)
			throw new Error("Function not implemented");
		for (const func of this.restrictions) {
			try {
				await func(player, room, string);
			} catch (e) {
				if (!e.message)
					throw new Error();
				throw new Error(`Failed to run: ${e.message}`);
			}
		}
		const args = parseArgs(string);
		if (this.args.length && args.length && this.args.at(-1).greedy)
			args.push(args.splice(this.args.length - 1, args.length - this.args.length + 1).join(" "));
		if (args.length > this.args.length)
			throw new Error(`Too many arguments`);
		for (let i = 0; i < args.length; ++i) {
			const arg = this.args[i];
			if (args[i] === undefined) {
				if (arg.optional)
					continue;
				throw new Error(`Missing argument: ${arg.name}`);
			}
			if (args[i].length > 50)
				throw new Error(`Invalid argument for ${arg.name}: Too long`);
			try {
				args[i] = arg.parse(args[i]);
			} catch (e) {
				throw new Error(`Invalid argument ${args[i]} for ${arg.name}: ${e.message}`);
			}
		}
		await this.func(player, room, ...args);
	}
}

export class Commands {
	constructor() {
		this.commands = {}
	}
	add(name, desc) {
		if (this.commands[name])
			throw `Command ${name} already exists`;
		const command = new Command().addInfo(name, desc);
		this.commands[name] = command;
		return command;
	}
	async exec(player, room, message) {
		const index = message.indexOf(" ");
		const cmd = message.slice(0, index === -1 ? undefined : index).toLowerCase();
		const args = index === -1 ? "" : message.slice(index + 1);
		if (!this.commands[cmd]) {
			if (cmd.length && /^[a-z_!]+$/.test(cmd))
				throw { message: `No such command ${cmd}` };
			return;
		}
		await this.commands[cmd].exec(player, room, args);
	}
}
