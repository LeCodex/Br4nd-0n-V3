import { User } from "discord.js";
import Cup from "./cup";
import MontpartasseGame from "./game";
import { range } from "lodash";
import { client } from "client";

export default class MontpartassePlayer {
    score = 0;
    hand: Array<Cup>;
    nextTimestamp: number = 0;

    constructor(public game: MontpartasseGame, public user: User) {
        this.hand = range(3).map((_) => game.getRandomCup());
    }

    toString() {
        return `${this.user}`;
    }

    serialize() {
        return {
            user: this.user.id,
            score: this.score,
            nextTimestamp: this.nextTimestamp,
            hand: this.hand.map((e) => e.serialize()),
        };
    }

    static async load(game: MontpartasseGame, obj: ReturnType<MontpartassePlayer["serialize"]>): Promise<MontpartassePlayer> {
        const instance = new this(game, await client.users.fetch(obj.user));
        instance.score = obj.score;
        instance.hand = obj.hand.map((e) => game.loadCup(e));
        instance.nextTimestamp = obj.nextTimestamp;
        return instance;
    }
}