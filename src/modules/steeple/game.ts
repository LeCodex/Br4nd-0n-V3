import { DateTime } from "luxon";
import { Game } from "modules/game";
import Tile, * as Tiles from "./tiles";
import SteeplePlayer from "./player";
import { EmbedBuilder } from "discord.js";
import { shuffle } from "utils";

export default class SteepleGame extends Game {
	declare module: Steeple;
	board: Tile[] = [];
	order: string[] = [];
	players: Record<string, SteeplePlayer> = {};
	summary: string[] = [];
	nextTimestamp = DateTime.local();
	enabled = Object.keys(Tiles).filter((e) => e !== "default") as (Exclude<keyof typeof Tiles, "default">)[];
	turn = 1;
	timeout?: NodeJS.Timeout = undefined;
	gamerules = {};
	waitDuration = {
		minutes: 0,
		hours: 1
	}

	override async start() {
		this.generateBoard(60);
		await this.sendBoard(true);
		this.setupTimeout();
		await this.save();
	}

	setupTimeout(newTurn = true) {
		if (this.timeout) clearTimeout(this.timeout);

		let now = DateTime.local();
		if (newTurn) {
			this.nextTimestamp = this.nextTimestamp.plus(this.waitDuration).set({ second: 0 });
			if (!this.waitDuration.minutes) this.nextTimestamp = this.nextTimestamp.set({ minute: 0 });
		}
		let time = this.nextTimestamp.toMillis() - now.toMillis();

		this.timeout = setTimeout(() => {this.throwDice()}, time);
	}

	generateBoard(size: number) {
		for (let i = 0; i < 4; i++) {
			this.enabled.forEach((element) => this.board.push(new Tiles[element](this)));
		}

		for (let i = this.board.length; i < size; i++) {
			this.board.push(new Tiles.Chair(this));
		}

		this.board = shuffle(this.board);
	}

	async sendBoard(save = false) {
		let board = "";
		let lineSize = 12;
		for (let i = 0; i < Math.ceil(this.board.length / lineSize); i++) {
			let boardLine = "";
			let playerLines = [];
			let maxPlayers = 0;
			for (let j = 0; j < lineSize; j++) {
				if (lineSize * i + j >= this.board.length) break;

				boardLine += this.board[lineSize * i + j].emoji;
				let column = Object.values(this.players).filter(e => e.index == lineSize * i + j).map(e => e.emoji.toString());
				playerLines.push(column);
				maxPlayers = Math.max(maxPlayers, column.length);
			}

			for (let j = playerLines.length; j > 0; j--) {
				if (playerLines[j - 1].length) break;
				playerLines.pop();
			}

			let line = "";
			for (let j = maxPlayers; j > 0; j--) line += playerLines.map(e => e.length >= j ? e[j - 1] : "⬛").join("") + "\n";
			line += boardLine;

			board += line + "\n\n";
		}

		// let board = this.board.map((e, index) =>
		// 	e.emoji.toString() + " " + Object.values(this.players).filter(f => f.index === index).map(f => f.toString()).join(" ")
		// ).join("\n")

		let embed = new EmbedBuilder()
			.setTitle("Steeple Chaise")
			.setColor(this.module.color)
			.setFooter({ text: "Tour #" + this.turn + " • Mettez une réaction à ce message pour changer de pion!" })

		if (this.summary.length) {
			let totalLength = 0;
			let field = {
				name: "Résumé du dernier lancer",
				value: ""
			}
			this.summary.forEach((element, i) => {
				totalLength += (element + "\n").length;
				if (totalLength >= 1024) {
					embed.addFields(field);
					field.value = "";
					field.name = "Suite du résumé"
					totalLength = (element + "\n").length;
				}
				field.value += element + "\n";
			});
			if (field.value.trim().length) embed.addFields(field);
		}

		let activeEffects = Object.values(this.players).filter(e => e.effects.length).map(e => e.toString() + ": " + e.effects.map(f => f.name).join(", ")).join("\n")
		if (activeEffects.length) {
			embed.addField(
				"Effets actifs",
				activeEffects
			);
		}

		let nbPlayersPerLine = 2;
		if (this.order.length) {
			let field = {
				name: "Ordre",
				value: ""
			}
			this.order.forEach((e, i) => {
				let string = (i + 1) + "․ " + (this.players[e].pushedBackUpOnce ? "" : "__") + this.players[e].toString() + (this.players[e].pushedBackUpOnce ? "" : "__") + ((i + 1) % nbPlayersPerLine === 0 ? "\n" : " | ")

				if (field.value.length + string.length >= 1024) {
					embed.addFields(field);
					field.value = "";
					field.name = "Suite de l'ordre"
				}

				field.value += string;
			});
			if (field.value.trim().length) embed.addFields(field);
		}

		embed.addField("Plateau", board);

		if (this.boardMessage) {
			let length = this.channel.messages.cache.keyArray().length
			if (length - this.channel.messages.cache.keyArray().indexOf(this.boardMessage.id) > 10) {
				this.deleteBoardMessage();
				this.boardMessage = await this.channel.send(embed);
				this.setupReactionCollector();
			} else {
				this.boardMessage.edit(embed);
			};
		} else {
			this.boardMessage = await this.channel.send(embed);
			this.setupReactionCollector();
		}
	}

	setupReactionCollector() {
		this.clearReactionCollector();
		this.collector = this.boardMessage.createReactionCollector((reaction, user) => true);
		this.collector.on('collect', (reaction, user) => {
			try {
				if (this.paused) return;

				let banned_emojis = ["⬛", "◼", "◾", "▪", "🖤", "〰", "➗", "✖", "➖", "➕", "➰"];
				let player = this.players[user.id];
				if (player && !banned_emojis.includes(reaction.emoji.name)) {
					player.emoji = reaction.emoji.id ? reaction.emoji : reaction.emoji.name;
					this.sendBoard();
					this.save();
				}

				reaction.users.remove(user);
			} catch (e) {
				this.client.error(this.channel, "Steeple Chaise", e);
			}
		});
	}

	throwDice() {
		let diceResult = Math.floor(Math.random() * this.order.length);

		this.order.forEach((id) => {
			this.players[id].turn(this, diceResult);
			this.players[id].pushedBackUpOnce = false;
			this.summary.push("");
		});

		this.order.forEach(element => {
			let player = this.players[element];
			player.effects.forEach((effect) => {
				effect.throwEnd(player);
			});
		});

		// this.sendBoard();

		this.turn++;
		this.sendBoard(true);

		this.setupTimeout();
		this.save();
	}

	clearReactionCollector() {
		if (this.boardMessage) this.boardMessage.reactions.removeAll();
		if (this.collector) this.collector.stop();
	}

	deleteBoardMessage() {
		if (this.boardMessage) {
			this.boardMessage.delete();
			this.boardMessage = null;
		}
		this.clearReactionCollector();
	}

	async resendMessage() {
		this.deleteBoardMessage();
		await this.sendBoard();
		this.save();
	}

	serialize() {
		let object = {
			channel: this.channel.id,
			players: {},
			boardMessage: this.boardMessage ? this.boardMessage.id : null,
			paused: this.paused,
			nextTimestamp: this.nextTimestamp.toMillis(),
			gamerules: this.gamerules,
			board: this.board.map(e => e.constructor.name),
			order: this.order,
			summary: this.summary,
			boards: this.boards.map(e => e.toJSON()),
			enabled: this.enabled,
			turn: this.turn,
			waitDuration: this.waitDuration
		};

		for (let [k, e] of Object.entries(this.players)) {
			object.players[k] = {
				score: Number(e.score),
				user: e.user.id,
				effects: e.effects.map(f => {
					return {
						name: f.constructor.name,
						data: f.data
					};
				}),
				pushedBackUpOnce: e.pushedBackUpOnce,
				index: e.index,
				emoji: e.emoji.id ? e.emoji.id : e.emoji
			}
		}

		return object;
	}
}
