import { Emoji, User } from "discord.js";
import SteepleGame from "./game";
import { Effect } from "./effects";
import { randomlyPick } from "utils";

export default class SteeplePlayer {
	index = 0;
	score = 0;
	effects: Effect<any>[] = [];
	pushedBackUpOnce = false;
	emoji: string | Emoji;

	constructor(public user: User, public game: SteepleGame) {
		this.user = user;
		let defaultEmojis = ["🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "🟫", "⬜"];
		this.emoji = randomlyPick(defaultEmojis);
	}

	move(amount: number) {
		if (!amount) {
			this.game.summary.push(`⏺️ ${this.toString()} a fait du sur-place`);
			return;
		}

		this.effects.forEach(element => {
			amount = element.preMove(this.index, amount);
		});

		let newIndex = (this.index + amount + this.game.board.length) % this.game.board.length;
		if (!this.effects.every(e => e.tryToMove(newIndex))) return;
		if (!this.game.board[newIndex].tryToMove(this, newIndex)) return;

		let oldIndex = this.index;
		this.index += amount;

		this.game.summary.push(`${amount > 0 ? "▶️" : "◀️"} ${this.toString()} a ${amount > 0 ? "avancé" : "reculé"} de ${Math.abs(amount)} ${Math.abs(amount) > 1 ? "cases" : "case"}`);

		this.effects.forEach(element => {
			element.onMove(this.index, amount);
		});

		this.checkForWrapping();

		let canTriggerEffect = this.index !== oldIndex;
		this.effects.forEach(element => {
			canTriggerEffect = element.postMove(this.index) && canTriggerEffect;
		});

		this.effects = this.effects.filter(e => !e.used);

		if (canTriggerEffect) {
			this.game.board[this.index].effect?.(this, this.index, amount);
		}

		this.checkForWrapping();
	}

	checkForWrapping() {
		if (this.index >= this.game.board.length) {
			this.index -= this.game.board.length;
			this.score++;
			this.game.summary.push(`🏅 **${this.toString()} a gagné 1 point!**`);
		} else if (this.index < 0) {
			if (this.score) {
				this.index += this.game.board.length;
				this.score--;
				this.game.summary.push(`❌ **${this.toString()} a perdu 1 point!**`);
			} else {
				this.index = 0;
				this.game.summary.push(`↪️ **${this.toString()} ne peut pas descendre en dessous de 0 point**`);
			}
		}
	}

	turn(diceResult: number) {
		const place = this.game.order.indexOf(this.user.id);
		if (place <= diceResult) this.move(place + 1);

		this.effects.forEach(element => {
			element.turnEnd(this.index);
		});
		this.effects = this.effects.filter(e => !e.used);
	}

	addEffect(effect: Effect<any>) {
		this.effects.push(effect);
		this.game.summary.push(`✨ ${this.toString()} a gagné l'effet " + effect.name`);
	}

	toString() {
		return `${this.emoji.toString()} ${this.user.toString()}`;
	}
}
