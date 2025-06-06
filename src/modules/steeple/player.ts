import { User } from "discord.js";
import SteepleGame from "./game";
import Effect, * as Effects from "./effects";
import { COLORED_SQUARES, randomlyPick } from "utils";
import { client } from "client";

type EffectName = Exclude<keyof typeof Effects, "default">;

export default class SteeplePlayer {
    index = 0;
    score = 0;
    effects: Effect<any>[] = [];
    movedThisTurn = false;
    emoji: string;

    constructor(public game: SteepleGame, public user: User) {
        this.user = user;
        this.emoji = randomlyPick(COLORED_SQUARES);
    }

    get rankScore() { return [this.score, this.index]; }

    /** Stops when one element returns true */
    forEachEffect(fn: (element: Effect, index: Number, array: Array<Effect>) => boolean | void) {
        const result = this.effects.some(fn);
        this.effects = this.effects.filter(e => !e.used);
        return result;
    }

    move(amount: number) {
        if (!amount) {
            this.game.summary.push(`⏺️ ${this.toString()} a fait du sur-place`);
            return;
        }

        this.forEachEffect(element => {
            amount = element.preMove(this.index, amount);
        });

        const newIndex = (this.index + amount + this.game.board.length) % this.game.board.length;
        if (!this.forEachEffect(e => !e.tryToMove(newIndex))) return;
        if (!this.game.board[newIndex].tryToMove(this, newIndex)) return;

        const oldIndex = this.index;
        this.index += amount;

        this.game.summary.push(`${amount > 0 ? "▶️" : "◀️"} ${this.toString()} a ${amount > 0 ? "avancé" : "reculé"} de ${Math.abs(amount)} ${Math.abs(amount) > 1 ? "cases" : "case"}`);

        this.forEachEffect(element => {
            element.onMove(this.index, amount);
        });

        this.checkForWrapping();

        let canTriggerEffect = this.index !== oldIndex && this.forEachEffect(element => {
            return element.postMove(this.index);
        });

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

    doTurn(diceResult: number) {
        const place = this.game.order.indexOf(this.user.id);
        if (place <= diceResult) this.move(place + 1);

        this.forEachEffect(element => {
            element.turnEnd(this.index);
        });
    }

    addEffect(effect: Effect<any>) {
        this.effects.push(effect);
        this.game.summary.push(`✨ ${this.toString()} a gagné l'effet ${effect.name}`);
    }

    toString() {
        return `${this.emoji} ${this.user.toString()}`;
    }
    
    serialize() {
        return {
            user: this.user.id,
            index: this.index,
            score: this.score,
            effects: this.effects.map((e) => e.serialize()),
            movedThisTurn: this.movedThisTurn,
            emoji: this.emoji,
        }
    }

    static async load(game: SteepleGame, obj: ReturnType<SteeplePlayer["serialize"]>): Promise<SteeplePlayer> {
        const instance = new this(game, await client.users.fetch(obj.user));
        instance.index = obj.index;
        instance.score = obj.score;
        instance.effects = obj.effects.map((e) => new Effects[e.cls as EffectName](game, instance, e.data));
        instance.movedThisTurn = obj.movedThisTurn;
        instance.emoji = obj.emoji;
        return instance;
    }
}
