import { Client, User } from "discord.js";
import CompoteDePommesGame from "./game";

export default class CompoteDePommesPlayer {
    rolls: number = 0;
    hands: number = 6;
    basket: number = 0;
    locked: number = 0;
    get apples() { return this.basket + this.locked; }
    effects: Record<number, number> = {};
    lastLetter: string = "";

    constructor(public game: CompoteDePommesGame, public user: User) { }

    incrementEffect(index: number, amount: number = 1) {
        this.effects[index] = (this.effects[index] ?? 0) + amount;
        this.game.summary.push(`${this.user.toString()} gagne **${amount}** effet${amount > 1 ? "s" : ""} **#${index}**!`);
    }

    useEffect(index: number, uses: number) {
        const amount = this.effects[index]
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

        if (amount < 0 && this.effects[5]) {
            this.stash(this.useEffect(5, Infinity));
        }

        this.basket = Math.max(0, this.basket + amount);
        this.game.summary.push(`${this.user.toString()} ${amount >= 0 ? "ajoute" : "perd"} **${Math.abs(amount)} 🍎** ${Math.abs(amount) >= 0 ? "dans" : "de"} son 🧺!`);
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

        if (other.effects[12]) {
            this.useEffect(12, 1);
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
        const activeEffects = Object.entries(this.effects).filter(([_ , v]) => v > 0)
        return `Tu possèdes **${this.apples}** 🍎 ! *(${this.locked} 🔐 - ${this.basket} 🧺)*`
            + `\nIl te reste **${this.hands}**/${this.game.maxHands} cueillette${this.hands > 1 ? "s" : ""}`
            + (activeEffects.length > 0 ? `\nEffets : ${activeEffects.map(([k, v]) => `**#${k} x${v}**`).join(', ')}` : '');
    }

    serialize() {
        return {
            user: this.user.id,
            apples: this.basket,
            locked: this.locked,
            effects: this.effects
        };
    }

    static async parse(obj: ReturnType<CompoteDePommesPlayer["serialize"]>, game: CompoteDePommesGame, client: Client) {
        const instance = new this(game, await client.users.fetch(obj.user));
        instance.basket = obj.apples;
        instance.locked = obj.locked;
        instance.effects = obj.effects;
        return instance;
    }
}