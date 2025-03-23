import { User } from "discord.js";
import CompoteDePommesGame from "./game";
import { getRankEmoji } from "utils";
import CompoteDePommes from ".";
import { client } from "client";

export default class CompoteDePommesPlayer {
    rolls: number = 0;
    hands: number;
    basket: number = 0;
    locked: number = 0;
    get apples() { return this.basket + this.locked; }
    effects: Record<number, number> = {};
    lastLetter: string = "";

    constructor(public game: CompoteDePommesGame, public user: User) {
        this.hands = game.maxHands;
    }

    incrementEffect(index: number, amount: number = 1) {
        this.effects[index] = (this.effects[index] ?? 0) + amount;
        this.game.summary.push(`${this.user.toString()} gagne **${amount}** effet${amount > 1 ? "s" : ""} **#${index}**!`);
    }

    useEffect(index: number, uses: number) {
        const amount = this.effects[index];
        uses = Math.min(amount, uses);
        if (amount) {
            this.game.summary.push(`${this.user.toString()} utilise **${uses}** effet${amount > 1 ? "s" : ""} **#${index}**! Il lui en reste **${amount - uses}**.`);
            this.effects[index] -= uses;
            return amount;
        }
        return 0;
    }

    gain(amount: number) {
        amount = -Math.min(-amount, this.basket);
        if (!amount) return;

        if (amount < 0) {
            const stashed = this.useEffect(5, Infinity);
            if (stashed) this.stash(stashed);
        }

        this.basket = Math.max(0, this.basket + amount);
        this.game.summary.push(`${this.user.toString()} ${amount >= 0 ? "ajoute" : "perd"} **${Math.abs(amount)} 🍎** ${amount >= 0 ? "dans" : "de"} son 🧺!`);
    }

    gainHands(amount: number) {
        this.hands = Math.min(Math.max(0, this.hands + amount), this.game.maxHands);
        this.game.summary.push(`${this.user.toString()} ${amount >= 0 ? "gagne" : "perd"} **${Math.abs(amount)} lancer${Math.abs(amount) > 1 ? "s" : ""}**!`);
    }

    steal(other: CompoteDePommesPlayer, amount: number) {
        amount = Math.min(other.basket, amount);
        if (!amount) return;

        other.basket -= amount;
        this.basket += amount;
        this.game.summary.push(`${this.user.toString()} vole **${amount} 🍎** à ${other.user.toString()}!`);

        if (other.useEffect(12, 1)) {
            other.steal(this, amount * 2);
        }
    }

    stash(amount: number) {
        amount = Math.min(amount, this.basket);
        if (!amount) return;
        
        this.basket -= amount;
        this.locked += amount;
        this.game.summary.push(`${this.user.toString()} planque **${Math.abs(amount)} 🍎** dans son 🔐!`);
    }

    stashIfGreaterOrGain(amount: number) {
        if (this.basket > this.locked) {
            this.stash(amount);
        } else {
            this.gain(amount);
        }
    }

    get summary() {
        const activeEffects = Object.entries(this.effects).filter(([_, v]) => v > 0);
        const rank = this.game.order.indexOf(this);
        return `Tu possèdes **${this.apples}** 🍎 ! *(${this.locked} 🔐 - ${this.basket} 🧺)*`
            + `\nIl te reste **${this.hands}**/${this.game.maxHands} cueillette${this.hands > 1 ? "s" : ""}`
            + (activeEffects.length > 0 ? `\nEffets : ${activeEffects.map(([k, v]) => `**#${k} x${v}**`).join(', ')}` : '')
            + `\nRang: ${getRankEmoji(rank)} ** ${rank + 1}**`;
    }

    serialize() {
        return {
            user: this.user.id,
            rolls: this.rolls,
            basket: this.basket,
            locked: this.locked,
            effects: this.effects,
            hands: this.hands,
            lastLetter: this.lastLetter,
        };
    }

    static async load(module: CompoteDePommes, game: CompoteDePommesGame, obj: ReturnType<CompoteDePommesPlayer["serialize"]>) {
        const instance = new this(game, await client.users.fetch(obj.user));
        instance.rolls = obj.rolls;
        instance.basket = obj.basket;
        instance.locked = obj.locked;
        instance.effects = obj.effects;
        instance.hands = obj.hands;
        instance.lastLetter = obj.lastLetter;
        return instance;
    }
}