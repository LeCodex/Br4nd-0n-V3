import { APIEmbed, ChatInputCommandInteraction, Message, MessageFlags, User } from "discord.js";
import Bossle from ".";
import { Game } from "../game";
import BosslePlayer from "./player";
import { randomlyPick } from "../../utils";
import { DateTime } from "luxon";
import { random, range } from "lodash";
import ShopItem, * as Items from "./item";
import BossEffect, * as Effects from "./effects";
import BossleView from "./view";
import View from "../../view";
import { loadItem } from "./utils";

export enum WordleResult {
    CORRECT,
    WRONG_PLACE,
    INCORRECT
}
export type ConcreteItems = Omit<typeof Items, "default">;
const ALL_ITEMS = Object.entries(Items).filter(([k]) => k !== "default").map(([_, v]) => v) as Array<ConcreteItems[keyof ConcreteItems]>;
export type ConcreteEffects = Omit<typeof Effects, "default">;
const ALL_EFFECTS = Object.entries(Effects).filter(([k]) => k !== "default").map(([_, v]) => v) as Array<ConcreteEffects[keyof ConcreteEffects]>;

export interface BossleEvents {
    attempt: { readonly player: BosslePlayer, attempt: string }
    result: { readonly player: BosslePlayer, result: Array<WordleResult>, dmgPerIncorrect: number, xpPerCorrect: number, goldPerMisplaced: number }
    finished: { readonly player: BosslePlayer, xpGained: number }
    gainXP: { amount: number }
    gainGold: { amount: number }
    gainHealth: { amount: number }
    monsterDamage: { readonly player: BosslePlayer, amount: number }
    turnEnd: {}
    defeated: { regenRatio: number }
}
export type BossleEventHandler<K extends keyof BossleEvents = keyof BossleEvents> = (context: BossleEvents[K]) => void;

export default class BossleGame extends Game {
    declare module: Bossle;
    players: Record<string, BosslePlayer> = {};

    gold = 0;
    xp = 0;
    level = 0;
    health = 0;
    turnHealthChange = 0;

    monster = {
        level: 0,
        turnHealthChange: 0,
        health: 0,
        maxHealth: 0,
    };
    monsterEffects: Array<BossEffect> = [];
    targetWord = "";

    listeners: { [K in keyof BossleEvents]?: Set<BossleEventHandler<K>> } = {};
    onceListeners = new Set<BossleEventHandler>();

    turn = 0;
    shop: Array<ShopItem | undefined> = [];

    bestRun = {
        level: 0,
        monsterLevel: 0
    }
    
    boardView?: BossleView;
    timeout?: NodeJS.Timeout;
    nextTimestamp?: number;

    constructor(module: Bossle, channelId: string) {
        super(module, channelId);
    }

    public async start(interaction: ChatInputCommandInteraction): Promise<void> {
        await this.newGame();
        await super.start(interaction);
        await this.save();
    }

    setupTimeout() {
        let next = DateTime.now().setZone("Europe/Paris");
        next = next.set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).plus({ day: 1 });
        this.nextTimestamp = next.toMillis();

        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => this.nextTurn(), this.nextTimestamp - DateTime.now().setZone("Europe/Paris").toMillis());
    }

    getPlayer(user: User) {
        return this.players[user.id] ??= new BosslePlayer(this, user);
    }

    get isMonsterAlive() { return this.monster.health > 0; }
    get xpForNextLevel() { return 190 + 10 * this.level; }
    get maxHealth() { return 110 + 10 * this.level; }
    get maxGold() { return 125 + 25 * this.level; }

    emit<K extends keyof BossleEvents>(key: K, context: BossleEvents[K]): BossleEvents[K] {
        if (!this.listeners[key]) return context;
        for (const listener of this.listeners[key]) {
            listener(context);
            if (this.onceListeners.has(listener as BossleEventHandler)) {
                this.listeners[key].delete(listener);
            }
        }
        return context;
    }

    on<K extends keyof BossleEvents>(key: K, listener: BossleEventHandler<K>) {
        this.listeners[key] ??= new Set<BossleEventHandler>();
        this.listeners[key].add(listener);
    }

    once<K extends keyof BossleEvents>(key: K, listener: BossleEventHandler<K>) {
        this.on(key, listener);
        this.onceListeners.add(listener as BossleEventHandler);
    }

    untilEndOfTurn<K extends keyof BossleEvents>(key: K, listener: BossleEventHandler<K>) {
        this.on(key, listener);
        this.once("turnEnd", () => {
            this.listeners[key]?.delete(listener);
        });
    }

    off<K extends keyof BossleEvents>(key: K, listener: BossleEventHandler<K>) {
        this.listeners[key]?.delete(listener);
    }

    async newGame() {
        delete this.boardView;
        this.monster = {
            level: 1,
            health: 20,
            maxHealth: 20,
            turnHealthChange: 0
        };
        this.gold = 0;
        this.level = 1;
        this.health = this.maxHealth;
        this.turn = 0;
        await this.nextTurn();
    }

    async nextTurn() {
        this.emit("turnEnd", {});

        for (const player of Object.values(this.players)) {
            if (player.lastAttempt && !player.finished && this.isMonsterAlive) {
                this.health -= 5 * (player.maxAttempts - player.attempts.length);
            }
        }

        if (this.targetWord) {
            await this.sendBoard({ showWord: true, edit: true });
            await this.boardView?.end();
        }

        this.turnHealthChange = 0;
        this.monster.turnHealthChange = 0;
        this.turn++;
        this.targetWord = randomlyPick(this.module.targetWords).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

        for (const player of Object.values(this.players)) {
            player.attempts.length = 0;
            delete player.attemptsBoard;
        }

        if (!this.isMonsterAlive) {
            const healthGain = random(1, 10);
            this.monster.maxHealth += healthGain
            this.monster.health = this.monster.maxHealth;
            this.monster.level++;
            this.monsterEffects.forEach((e) => e.destroy());
            this.monsterEffects.length = 0;
            for (let i = 0; i < Math.ceil((10 - healthGain) / 3); i++) {
                let cls: ConcreteEffects[keyof ConcreteEffects];
                do {
                    cls = randomlyPick(ALL_EFFECTS);
                } while (this.monsterEffects.filter((e) => e.constructor === cls).length)
                this.monsterEffects.push(new cls(this));
            }
        }

        this.shop = range(5).map(() => new (randomlyPick(ALL_ITEMS))(this));

        await this.sendBoard();
        await this.checkForNewGame();
        this.setupTimeout();
    }

    gainXP(amount: number) {
        this.xp += this.emit("gainXP", { amount }).amount;
        if (this.xp > this.xpForNextLevel) {
            this.xp -= this.xpForNextLevel;
            const oldMaxHealth = this.maxHealth;
            this.level++;
            this.gainHealth(this.maxHealth - oldMaxHealth);
        }
    }

    gainGold(amount: number) {
        this.gold = Math.max(0, Math.min(this.gold + this.emit("gainGold", { amount }).amount, this.maxGold));
    }

    gainHealth(amount: number) {
        this.health = Math.max(0, Math.min(this.health + this.emit("gainHealth", { amount }).amount, this.maxHealth));
        this.turnHealthChange += amount;
    }

    async checkForNewGame() {
        if (this.health <= 0) {
            this.bestRun = {
                level: this.level,
                monsterLevel: this.monster.level
            };
            this.channel?.send("# 💔 Vous avez été vaincus!");
            await this.newGame();
            return true;
        }
        return false;
    }

    async sendAttempt(interaction: ChatInputCommandInteraction) {
        const player = this.getPlayer(interaction.user);
        if (player.finished) {
            return interaction.reply({ content: "Vous avez déjà fini", flags: MessageFlags.Ephemeral });
        } else if (player.attempts.length >= player.maxAttempts) {
            return interaction.reply({ content: "Vous n'avez plus d'essais", flags: MessageFlags.Ephemeral });
        }

        const input = interaction.options.get("mot")?.value;
        if (!input || typeof input !== "string") {
            return interaction.reply({ content: "Veuillez renseigner un mot", flags: MessageFlags.Ephemeral });
        }

        const word = input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        if (word.length !== this.targetWord.length) {
            return interaction.reply({ content: "Le mot ne fait pas la bonne longueur", flags: MessageFlags.Ephemeral });
        }
        const knownIncorrectLetters = word.split("").map((e) => player.attemptedLetter(e) && !this.targetWord.includes(e))
        if (knownIncorrectLetters.some((e) => e)) {
            return interaction.reply({ content: `Le mot contient des lettres que vous savez incorrectes (${word.split("").filter((_, i) => knownIncorrectLetters[i]).join(", ")})`, flags: MessageFlags.Ephemeral });
        }
        if (!this.module.words.has(word)) {
            return interaction.reply({ content: "Le mot n'est pas valide", flags: MessageFlags.Ephemeral });
        }

        player.attempts.push(word);
        const { result, xpPerCorrect, goldPerMisplaced, dmgPerIncorrect } = this.emit("result", { player, result: this.attemptToResult(word), dmgPerIncorrect: 1, xpPerCorrect: 1, goldPerMisplaced: 1 });
        for (const tile of result) {
            if (tile === WordleResult.CORRECT) {
                this.gainXP(xpPerCorrect);
                player.stats.xpGained += xpPerCorrect;
            } else if (tile === WordleResult.WRONG_PLACE) {
                this.gainGold(goldPerMisplaced);
                player.stats.goldGained += goldPerMisplaced;
            } else if (this.isMonsterAlive) {
                this.gainHealth(-dmgPerIncorrect);
                player.stats.damageReceived += dmgPerIncorrect;
            }
        }
        await player.sendAttemptsBoard();

        if (player.finished && this.isMonsterAlive) {
            this.gainXP(this.emit("finished", { player, xpGained: 5 }).xpGained);
            player.damageMonster();
        }

        if (!this.isMonsterAlive) {
            const { regenRatio } = this.emit("defeated", { regenRatio: 1/4 });
            this.gainHealth(Math.floor(this.maxHealth * regenRatio + .5));
        }

        await this.sendBoard({ edit: true });
        await interaction.reply({ content: `\`\`\`\n${player.attempts.map((e) => `${this.renderAttempt(e)} ${e}`).join("\n")}\n${player.finished ? "" : `Lettres restantes: ${player.remainingLetters.join("")}\n`}\`\`\``, flags: MessageFlags.Ephemeral });
        await this.checkForNewGame();
        await this.save();
    }

    attemptToResult(attempt: string) {
        const result: Array<WordleResult> = [];
        const remainingLetters = this.targetWord.split("");
        for (const [i, letter] of attempt.split("").entries()) {
            if (letter === this.targetWord[i]) {
                result[i] = WordleResult.CORRECT;
                remainingLetters.splice(remainingLetters.indexOf(letter), 1);
            }
        }
        for (const [i, letter] of attempt.split("").entries()) {
            if (typeof result[i] !== "undefined") continue;
            if (remainingLetters.includes(letter)) {
                result[i] = WordleResult.WRONG_PLACE;
                remainingLetters.splice(remainingLetters.indexOf(letter), 1);
            } else {
                result[i] = WordleResult.INCORRECT;
            }
        }
        return result;
    }

    renderAttempt(attempt: string) {
        return this.attemptToResult(attempt).map((e) => e === WordleResult.CORRECT ? '🟩' : e === WordleResult.WRONG_PLACE ? '🟨' : '⬛').join("");
    }

    renderChange(amount: number) {
        return amount !== 0 ? ` **(${amount > 0 ? "+" : ""}${amount})**` : "";
    }

    async sendBoard(options?: { edit?: boolean, replace?: boolean, showWord?: boolean }) {
        const embed: APIEmbed = {
            title: `[BOSSLE] Résumé de la partie | Tour ${this.turn}`,
            fields: [
                {
                    name: `🐲 Monstre`,
                    value: `-# **❤️ Vie:** ${this.monster.health}/${this.monster.maxHealth}${this.renderChange(this.monster.turnHealthChange)}\n-# **⏫ Niveau:** ${this.monster.level}\n-# **📖 Mot:** \`${options?.showWord ? this.targetWord : '?'.repeat(this.targetWord.length)}\``,
                    inline: true
                },
                {
                    name: `🧮 Stats`,
                    value: `-# **❤️ Vie:** ${this.health}/${this.maxHealth}${this.renderChange(this.turnHealthChange)}\n-# **⏫ Niveau:** ${this.level} | **✨ XP:** ${this.xp}/${this.xpForNextLevel}\n-# **:coin: Or:** ${this.gold}/${this.maxGold}`,
                    inline: true
                },
                {
                    name: `💰 Magasin`,
                    value: `-# ${this.shop.length ? this.shop.map((e) => e ? e.toString() : "🚫 Epuisé, revenez demain!").join("\n-# ") : "🚫 Stock épuisé! Revenez demain!"}`
                },
                {
                    name: `🛡️ Aventuriers`,
                    value: Object.values(this.players).map((e) => `-# ${e}`).join("\n")
                }
            ],
            color: this.module.color
        };
        if (this.monsterEffects.length) {
            embed.fields?.splice(2, 0, {
                name: `❗ Effets du monstre`,
                value: this.monsterEffects.map((e) => e.toString()).join("\n")
            });
        }

        if (this.boardView && options?.edit) {
            this.boardView = await new BossleView(this, this.boardView.message).edit({ embeds: [embed] });
            await this.boardView.edit({ embeds: [embed] });
        } else if (this.channel) {
            if (options?.replace) await this.boardView?.delete();
            this.boardView = await new BossleView(this).send(this.channel, { embeds: [embed] });
        }
    }

    protected serialize() {
        return {
            ...super.serialize(),
            players: Object.fromEntries(Object.entries(this.players).map(([k, v]) => [k, v.serialize()])),
            gold: this.gold,
            xp: this.xp,
            level: this.level,
            health: this.health,
            turnHealthChange: this.turnHealthChange,
            monster: this.monster,
            monsterEffects: this.monsterEffects.map((e) => e.constructor.name as keyof ConcreteEffects),
            targetWord: this.targetWord,
            turn: this.turn,
            shop: this.shop.map((e) => e?.serialize()),
            bestRun: this.bestRun,
            boardView: this.boardView?.serialize(),
            nextTimestamp: this.nextTimestamp
        }
    }

    static async load(module: Bossle, channelId: string, obj: ReturnType<BossleGame["serialize"]>): Promise<BossleGame> {
        const instance = new this(module, channelId);
        instance.players = Object.fromEntries(await Promise.all(Object.entries(obj.players).map(async ([k, v]) => [k, await BosslePlayer.load(instance, v)])));
        instance.gold = obj.gold;
        instance.xp = obj.xp;
        instance.level = obj.level;
        instance.health = obj.health;
        instance.turnHealthChange = obj.turnHealthChange;
        instance.monster = obj.monster;
        instance.monsterEffects = obj.monsterEffects.map((e) => new Effects[e](instance));
        instance.targetWord = obj.targetWord;
        instance.turn = obj.turn;
        instance.shop = obj.shop.map((e) => e && loadItem(instance, e));
        instance.bestRun = obj.bestRun;
        if (obj.boardView) instance.boardView = new BossleView(instance, await View.load(obj.boardView));
        instance.nextTimestamp = obj.nextTimestamp;
        await instance.sendBoard({ edit: true });
        instance.setupTimeout();
        return instance;
    }
}
