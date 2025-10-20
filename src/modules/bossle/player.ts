import { Message, SendableChannels, User } from "discord.js";
import BossleGame, { WordleResult } from "./game";
import ShopItem from "./item";
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
    summary: Array<string> = [];
    incorrectLetters = new Set<string>();
    shopAllowed = true;

    constructor(public game: BossleGame, public user: User) { }

    get lastAttempt() {
        return this.attempts[this.attempts.length - 1];
    }

    get finished() {
        return !!this.lastAttempt && this.game.attemptToResult(this.lastAttempt).every((e) => e === WordleResult.CORRECT);
    }

    get done() {
        return this.finished || this.attempts.length >= this.maxAttempts;
    }

    get remainingLetters() {
        return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter((e) => !this.incorrectLetters.has(e));
    }

    get privateAttemptContent() {
        return `\`\`\`\nEssai ${this.attempts.length}/${this.maxAttempts}\n${this.attempts.map((e) => `${this.game.renderAttempt(e)} ${e}`).join("\n")}\n${this.finished || this.attempts.length >= this.maxAttempts ? "" : `Lettres restantes: ${this.remainingLetters.join("")}\n`}\n${this.summary.join("\n")}\`\`\``
    }

    attemptedLetter(letter: string) {
        return this.attempts.some((e) => e.includes(letter));
    }

    damageMonster(amount: number) {
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
        return `${this.user}: ${this.lastAttempt ? `\`${this.game.renderAttempt(this.lastAttempt)}\`` : "Pas d'essai"} ${[...this.items].map((i) => i.toCondensed()).join(", ")}`;
    }

    serialize() {
        return {
            user: this.user.id,
            attempts: this.attempts,
            attemptsBoard: this.attemptsBoard?.id,
            stats: this.stats,
            maxAttempts: this.maxAttempts,
            items: [...this.items].map((e) => e.serialize()),
            summary: this.summary,
            incorrectLetters: [...this.incorrectLetters],
            shopAllowed: this.shopAllowed
        }
    }

    static async load(game: BossleGame, obj: ReturnType<BosslePlayer["serialize"]>): Promise<BosslePlayer> {
        const instance = new this(game, await client.users.fetch(obj.user));
        instance.attempts = obj.attempts;
        instance.stats = obj.stats;
        instance.maxAttempts = obj.maxAttempts;
        obj.items.map((e) => loadItem(game, e)).forEach((e) => e.buy(instance));
        instance.summary = obj.summary;
        instance.incorrectLetters = new Set(obj.incorrectLetters);
        instance.shopAllowed = obj.shopAllowed ?? instance.done;
        if (obj.attemptsBoard) {
            instance.attemptsBoard = await (await client.channels.fetch(game.channelId) as SendableChannels).messages.fetch(obj.attemptsBoard);
        }
        return instance;
    }
}
