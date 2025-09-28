import { Message, SendableChannels, User } from "discord.js";
import BossleGame, { ConcreteItems, WordleResult } from "./game";
import ShopItem, * as Items from "./item";
import { client } from "../../client";
import { loadItem } from "./utils";

export default class BosslePlayer {
    attempts: Array<string> = [];
    attemptsBoard: Message | undefined;
    stats = {
        xpGained: 0,
        goldGained: 0,
        goldSpent: 0,
        damageDealt: 0,
        damageReceived: 0,
    }
    maxAttempts = 6;
    items = new Set<ShopItem>();

    constructor(public game: BossleGame, public user: User) { }

    get lastAttempt() {
        return this.attempts[this.attempts.length - 1];
    }

    get finished() {
        return !!this.lastAttempt && this.game.attemptToResult(this.lastAttempt).every((e) => e === WordleResult.CORRECT);
    }

    get remainingLetters() {
        const incorrectLetters = this.attempts.reduce((a, e) => {
            for (const letter of e) {
                if (!this.game.targetWord.includes(letter) && !a.includes(letter)) {
                    a.push(letter);
                }
            }
            return a;
        }, [] as Array<string>);
        return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter((e) => !incorrectLetters.includes(e));
    }

    attemptedLetter(letter: string) {
        return this.attempts.some((e) => e.includes(letter));
    }

    damageMonster(amount: number = this.maxAttempts - this.attempts.length + 1) {
        amount = this.game.emit("monsterDamage", { player: this, amount }).amount;
        this.game.monster.health = Math.max(0, this.game.monster.health - amount);
        this.game.monster.turnHealthChange -= amount;
        this.stats.damageDealt += amount;
    }

    async sendAttemptsBoard() {
        const content = `${this}\n\`\`\`\n${this.attempts.map((e) => this.game.renderAttempt(e)).join("\n")}\n\`\`\``;
        if (this.attemptsBoard) {
            await this.attemptsBoard.edit(content);
        } else {
            this.attemptsBoard = await this.game.channel?.send(content);
        }
    }

    toString() {
        return `${this.user} ${[...this.items].map((e) => `${e.emoji}${' ' + '\\|'.repeat(e.uses)}`).join(", ")}`;
    }

    serialize() {
        return {
            user: this.user.id,
            attempts: this.attempts,
            attemptsBoard: this.attemptsBoard?.id,
            stats: this.stats,
            maxAttempts: this.maxAttempts,
            items: [...this.items].map((e) => e.serialize()),
        }
    }

    static async load(game: BossleGame, obj: ReturnType<BosslePlayer["serialize"]>): Promise<BosslePlayer> {
        const instance = new this(game, await client.users.fetch(obj.user));
        instance.attempts = obj.attempts;
        instance.stats = obj.stats;
        instance.maxAttempts = obj.maxAttempts;
        instance.items = new Set(obj.items.map((e) => loadItem(game, e)));
        instance.items.forEach((e) => e.buy(instance));
        if (obj.attemptsBoard) {
            instance.attemptsBoard = await (await client.channels.fetch(game.channelId) as SendableChannels).messages.fetch(obj.attemptsBoard);
        }
        return instance;
    }
}
