import { User } from "discord.js";
import BingoidGame from "./game";

export default class BingoidPlayer {
    score = 0;
    salt = 0;

    constructor(public game: BingoidGame, public user: User) {}

    public scorePoints(amount: number) {
        if (amount === 0) return;
        amount = -Math.min(0, -amount);
        this.score += amount;
        this.game.summary.push(`${amount > 0 ? "🏅" : "❌"} ${this} marque ${amount} ${Math.abs(amount) > 1 ? "points" : "point"}`);
    }

    public steal(other: BingoidPlayer, amount: number) {
        if (amount === 0) return;
        this.score += amount;
    }

    toString() {
        return `${this.user}`;
    }
}