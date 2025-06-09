import { User } from "discord.js";
import BingoidGame from "./game";
import { client } from "client";

export default class BingoidPlayer {
    score = 0;
    salt = 0;

    constructor(public game: BingoidGame, public user: User) { }

    public scorePoints(amount: number) {
        amount = -Math.min(-amount, this.score);
        if (amount === 0) return;
        this.score += amount;
        this.game.summary.push(`**${amount > 0 ? "🏅" : "❌"} ${this} ${amount > 0 ? "gagne" : "perd"} ${Math.abs(amount)} ${Math.abs(amount) > 1 ? "points" : "point"}**`);
    }

    public steal(other: BingoidPlayer, amount: number) {
        amount = Math.min(-Math.min(-amount, this.score), other.score);
        if (amount === 0) return;
        this.score += amount;
        other.score -= amount;
        this.game.summary.push(`**↔️ ${this} ${amount > 0 ? "vole" : "donne"} ${Math.abs(amount)} ${Math.abs(amount) > 1 ? "points" : "point"} à ${other}**`);
    }

    toString() {
        return `${this.user}`;
    }

    serialize() {
        return {
            user: this.user.id,
            score: this.score,
            salt: this.salt
        };
    }

    static async load(game: BingoidGame, obj: ReturnType<BingoidPlayer["serialize"]>): Promise<BingoidPlayer> {
        const instance = new this(game, await client.users.fetch(obj.user));
        instance.score = obj.score;
        instance.salt = obj.salt;
        return instance;
    }
}