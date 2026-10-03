import { APIEmbed, ChatInputCommandInteraction, MessageFlags, RepliableInteraction, User } from "discord.js";
import Bossle from ".";
import { Game } from "../game";
import BosslePlayer from "./player";
import { randomlyPick } from "src/utils";
import { DateTime } from "luxon";
import { random } from "lodash";
import ShopItem, * as Items from "./item";
import BossEffect, * as Effects from "./effects";
import * as Classes from "./classes";
import BossleView from "./view";
import View from "src/view";
import { loadItem } from "./utils";
import Logger from "src/logger";

export enum WordleResult {
    NONE,
    CORRECT,
    WRONG_PLACE,
    INCORRECT
}
export type ConcreteItems = Omit<typeof Items, "default" | "itemAttributesRepository">;
export const ALL_ITEMS = Object.entries(Items).filter(([k]) => k !== "default" && k !== "itemAttributesRepository").map(([_, v]) => v) as Array<ConcreteItems[keyof ConcreteItems]>;
export type ConcreteEffects = Omit<typeof Effects, "default" | "effectAttributesRepository">;
export const ALL_EFFECTS = Object.entries(Effects).filter(([k]) => k !== "default" && k !== "effectAttributesRepository").map(([_, v]) => v) as Array<ConcreteEffects[keyof ConcreteEffects]>;
export type ConcreteClasses = Omit<typeof Classes, "default" | "playerClassAttributesRepository">;
export const ALL_CLASSES = Object.entries(Classes).filter(([k]) => k !== "default"&& k !== "playerClassAttributesRepository").map(([_, v]) => v) as Array<ConcreteClasses[keyof ConcreteClasses]>;

export type BossleEvents = {
    attempt: { readonly player: BosslePlayer, readonly attempt: string, valid: boolean }
    editResultMonster: { readonly player: BosslePlayer, readonly attempt: string, result: Array<WordleResult> }
    editResultPlayers: { readonly player: BosslePlayer, readonly attempt: string, result: Array<WordleResult> }
    result: { readonly player: BosslePlayer, readonly attempt: string, readonly result: readonly WordleResult[], totalDmg: number, totalXp: number, totalGold: number, totalMana: number, ignore: boolean }
    finished: { readonly player: BosslePlayer, damage: number, factor: number }
    editGainXP: { amount: number }
    gainXP: { readonly amount: number }
    editGainGold: { amount: number }
    gainGold: { readonly amount: number }
    editGainMana: { amount: number }
    gainMana: { readonly amount: number }
    editGainHealth: { amount: number }
    gainHealth: { readonly amount: number }
    reveal: { letter: string | undefined }
    editMonsterDamage: { readonly player: BosslePlayer, amount: number, factor: number }
    monsterDamage: { readonly player: BosslePlayer, readonly amount: number }
    buy: { readonly player: BosslePlayer, readonly item: ShopItem }
    itemBreak: { readonly item: ShopItem }
    turnEnd: {}
    newMonster: {}
    turnStart: {}
    newWord: { length: number }
    defeated: { xp: number }
    levelUp: { regenRatio: number }
    lastBreath: { prevent: boolean }
}
export type BossleEventHandler<K extends keyof BossleEvents = keyof BossleEvents> = (context: BossleEvents[K]) => void;

export default class BossleGame extends Game {
    declare module: Bossle;
    players: Record<string, BosslePlayer> = {};

    gold = 0;
    mana = 0;
    xp = 0;
    level = 0;
    health = 0;
    turnHealthChange = 0;
    turnGoldChange = 0;
    turnManaChange = 0;
    turnXPChange = 0;

    monster = {
        level: 0,
        turnHealthChange: 0,
        health: 0,
        maxHealth: 0
    };
    monsterEffects: Array<BossEffect> = [];
    targetWord = "";
    revealedLetters = new Set<string>();

    listeners: { [K in keyof BossleEvents]?: Set<BossleEventHandler<K>> } = {};

    turn = 0;
    shop: Array<ShopItem | undefined> = [];
    refreshes = 0;

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
        if (!this.nextTimestamp) {
            let next = DateTime.now().setZone("Europe/Paris");
            next = next.set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).plus({ day: 1 });
            this.nextTimestamp = next.toMillis();
        }

        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => this.nextTurn(), this.nextTimestamp - Date.now());
    }

    getPlayer(user: User) {
        return this.players[user.id] ??= new BosslePlayer(this, user);
    }

    get isMonsterAlive() { return this.monster.health > 0; }
    get xpForNextLevel() { return 90 + 10 * this.level; }
    get maxHealth() { return Math.min(300, 120 + 10 * this.level); }
    get maxGold() { return Math.min(150, 20 + 5 * this.level); }
    get maxMana() { return Math.min(100, 20 + 5 * this.level); }
    get regenRatio() { return this.level < 3 ? 0.5 : this.level < 6 ? 0.25 : 0 }
    get refreshCost() { return Math.max(0, this.refreshes + 1); }

    emit<K extends keyof BossleEvents>(key: K, context: BossleEvents[K]): BossleEvents[K] {
        if (!this.listeners[key]) return context;
        for (const listener of this.listeners[key]) {
            listener(context);
        }
        return context;
    }

    on<K extends keyof BossleEvents>(key: K, listener: BossleEventHandler<K>) {
        this.listeners[key] ??= new Set<BossleEventHandler>();
        this.listeners[key].add(listener);
    }

    once<K extends keyof BossleEvents>(key: K, listener: BossleEventHandler<K>) {
        const wrappedListener = (context: BossleEvents[K]) => {
            listener(context);
            this.off(key, wrappedListener)
        };
        this.on(key, wrappedListener);
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
            health: 10,
            maxHealth: 10,
            turnHealthChange: 0
        };
        this.gold = 0;
        this.mana = 0;
        this.level = 0;
        this.health = this.maxHealth;
        this.turn = 0;
        this.targetWord = "";
        await this.nextTurn();
    }

    async nextTurn() {
        for (const player of Object.values(this.players)) {
            if (player.lastAttempt && !player.finished && this.isMonsterAlive) {
                this.health -= 5 * (player.maxAttempts - player.attempts.length);
            }
        }

        this.emit("turnEnd", {});
        if (this.targetWord) {
            await this.sendBoard({ showWord: true, edit: true });
        }

        this.turn++;
        this.turnHealthChange = 0;
        this.turnGoldChange = 0;
        this.turnManaChange = 0;
        this.turnXPChange = 0;
        this.monster.turnHealthChange = 0;

        if (!this.isMonsterAlive) {
            const healthGain = random(1, 20);
            this.monster.maxHealth += healthGain;
            this.monster.health = this.monster.maxHealth;
            this.monster.level++;
            this.monsterEffects.forEach((e) => e.destroy());
            this.monsterEffects.length = 0;
            for (let i = 0; i < Math.floor((24 - healthGain) / 6); i++) {
                let cls: ConcreteEffects[keyof ConcreteEffects];
                do {
                    cls = randomlyPick(ALL_EFFECTS);
                } while (this.monsterEffects.find((e) => e instanceof cls))
                this.monsterEffects.push(new cls(this));
            }
            this.emit("newMonster", {});
        }

        for (const player of Object.values(this.players)) {
            player.shopAllowed = player.done;
            player.attempts.length = 0;
            player.maxAttempts = 6;
            player.incorrectLetters.clear();
            delete player.attemptsBoard;
        }

        const targetLength = this.emit("newWord", { length: random(5, 7) }).length
        this.targetWord = randomlyPick(this.module.targetWords.filter((e) => e.length === targetLength)).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        this.shop.length = 0;
        for (let i = 0; i < 5; i++) {
            this.shop.push(this.pickRandomUniqueShopItem());
        }
        this.refreshes = 0;

        this.emit("turnStart", {});
        await this.sendBoard();
        await this.checkForNewGame();
    
        delete this.nextTimestamp;
        this.setupTimeout();
        await this.save();
    }

    pickRandomUniqueShopItem() {
        let item: ConcreteItems[keyof ConcreteItems];
        do {
            item = randomlyPick(ALL_ITEMS);
        } while (this.shop.find((e) => e instanceof item));
        return new item(this);
    }

    gainXP(amount: number) {
        amount = this.emit("editGainXP", { amount }).amount;
        this.emit("gainXP", { amount });
        this.xp += amount;
        this.turnXPChange += amount;
        if (this.xp > this.xpForNextLevel) {
            this.xp -= this.xpForNextLevel;
            const oldMaxHealth = this.maxHealth;
            const regenRatio = this.emit("levelUp", { regenRatio: this.regenRatio }).regenRatio;
            this.level++;
            this.gainHealth(this.maxHealth - oldMaxHealth + Math.round(this.maxHealth * regenRatio));
        }
    }

    gainGold(amount: number) {
        amount = this.emit("editGainGold", { amount }).amount;
        this.emit("gainGold", { amount });
        const trueAmount = Math.max(-this.gold, Math.min(amount, this.maxGold - this.gold));
        this.gold += trueAmount;
        this.turnGoldChange += trueAmount;
        // if (amount - trueAmount > 0) this.gainXP(amount - trueAmount);
    }

    gainMana(amount: number) {
        amount = this.emit("editGainMana", { amount }).amount;
        this.emit("gainMana", { amount });
        const trueAmount = Math.max(-this.mana, Math.min(amount, this.maxMana - this.mana));
        this.mana += trueAmount;
        this.turnManaChange += trueAmount;
        // if (amount - trueAmount > 0) this.gainXP(amount - trueAmount);
    }

    gainHealth(amount: number) {
        amount = this.emit("editGainHealth", { amount }).amount;
        this.emit("gainHealth", { amount });
        const trueAmount = Math.max(-this.health, Math.min(amount, this.maxHealth - this.health));
        this.health += trueAmount;
        this.turnHealthChange += trueAmount;
    }

    revealLetter(predicate: (letter: string) => boolean = () => true): string | undefined {
        let letter: string | undefined;
        for (let i = 0; i < 1000; i++) {
            letter = randomlyPick("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
            if (predicate(letter) && !this.revealedLetters.has(letter)) {
                break;
            }
            letter = undefined;
        }
        letter = this.emit("reveal", { letter }).letter;
        if (!letter) {
            this.channel?.send(`### ❌ La révélation de la lettre a échoué.`);
            return undefined;
        }
        return letter;
    }

    async checkForNewGame() {
        if (this.health <= 0) {
            if (this.emit("lastBreath", { prevent: false }).prevent) {
                return false;
            }

            this.bestRun = {
                level: this.level,
                monsterLevel: this.monster.level
            };
            this.channel?.send("# 💔 Vous avez été vaincus!");
            await this.newGame();
            return true;
        }
        if (this.level >= 30) {
            this.bestRun = {
                level: this.level,
                monsterLevel: this.monster.level
            };
            this.channel?.send("# 🎉 Vous avez gagné!");
            await this.newGame();
            return true;
        }
        return false;
    }

    async sendAttempt(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const player = this.getPlayer(interaction.user);
        if (player.finished) {
            return interaction.editReply({ content: "Vous avez déjà fini" });
        } else if (player.attempts.length >= player.maxAttempts) {
            return interaction.editReply({ content: "Vous n'avez plus d'essais" });
        }

        const input = interaction.options.get("mot")?.value;
        if (!input || typeof input !== "string") {
            return interaction.editReply({ content: "Veuillez renseigner un mot" });
        }

        const word = input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        if (word.length !== this.targetWord.length) {
            return interaction.editReply({ content: "Le mot ne fait pas la bonne longueur" });
        } else if (player.attempts.includes(word)) {
            return interaction.editReply({ content: "Vous avez déjà essayé ce mot" });
        }
        if (!this.module.words.has(word)) {
            return interaction.editReply({ content: "Le mot n'est pas valide" });
        }

        const { valid } = this.emit("attempt", { player, attempt: word, valid: true });
        if (!valid) {
            return interaction.editReply({ content: "Un effet vous empêche de jouer ce mot" });
        }

        const wasAlive = this.isMonsterAlive;
        player.summary.length = 0;
        player.attempts.push(word);

        let result = this.attemptToResult(word);
        for (const [i, tile] of result.entries()) {
            if (tile === WordleResult.INCORRECT) {
                player.incorrectLetters.add(word[i]!);
            }
        }
        result = this.emit("editResultMonster", { player, attempt: word, result }).result;
        result = this.emit("editResultPlayers", { player, attempt: word, result }).result;
        const {
            totalXp,
            totalGold,
            totalMana,
            totalDmg,
            ignore
        } = this.emit("result", {
            player,
            attempt: word,
            result,
            totalXp: 0,
            totalGold: result.filter((e) => e === WordleResult.WRONG_PLACE).length,
            totalMana: result.filter((e) => e === WordleResult.CORRECT).length,
            totalDmg: result.filter((e) => e === WordleResult.INCORRECT).length,
            ignore: false
        });
        if (!ignore) {
            this.gainXP(totalXp);
            player.stats.xpGained += totalXp;
            this.gainGold(totalGold);
            player.stats.goldGained += totalGold;
            this.gainMana(totalMana);
            player.stats.manaGained += totalMana;
            if (this.isMonsterAlive) {
                this.gainHealth(-totalDmg);
                player.stats.damageReceived += totalDmg;
            }
        }

        if (player.finished && wasAlive) {
            const { damage, factor } = this.emit("finished", { player, damage: player.maxAttempts - player.attempts.length + 1, factor: 1 });
            player.damageMonster(damage * factor);
        }
        await interaction.editReply({ content: player.privateAttemptContent });

        if (player.done) {
            player.shopAllowed = true;
        }

        if (!this.isMonsterAlive && wasAlive) {
            this.channel?.send("### ⚔️ Le monstre est vaincu!\nLes dégâts et effets sont désactivés jusqu'à la fin du tour");
            const { xp } = this.emit("defeated", { xp: this.xpForNextLevel });
            this.gainXP(xp);
            this.monsterEffects.forEach((e) => e.destroy());
        }

        await this.sendBoard({ edit: true });
        await player.sendAttemptsBoard();
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
        return this.attemptToResult(attempt).map((e) => e === WordleResult.CORRECT ? '🟩' : e === WordleResult.WRONG_PLACE ? '🟡' : '⬛').join("");
    }

    renderChange(amount: number) {
        return amount !== 0 ? ` **(${amount > 0 ? "+" : ""}${amount})**` : "";
    }

    async sendBoard(options?: { edit?: boolean, replace?: boolean, showWord?: boolean, ephemeralReplyTo?: RepliableInteraction }) {
        const embed: APIEmbed = {
            title: `[BOSSLE] Résumé de la partie | Tour ${this.turn}`,
            fields: [
                {
                    name: `🐲 Monstre`,
                    value: `-# **❤️ Vie:** ${this.monster.health}/${this.monster.maxHealth}${this.renderChange(this.monster.turnHealthChange)}\n`
                        + `-# **⏫ Niveau:** ${this.monster.level}\n`
                        + `-# **📖 Mot:** \`${options?.showWord ? this.targetWord : '?'.repeat(this.targetWord.length)}\` (${this.targetWord.length})`,
                    inline: true
                },
                {
                    name: `🧮 Stats`,
                    value: `-# **❤️ Vie:** ${this.health}/${this.maxHealth}${this.renderChange(this.turnHealthChange)}\n`
                        + `-# **⏫ Niveau:** ${this.level} | **✨ XP:** ${this.xp}/${this.xpForNextLevel}\n`
                        + `-# **🟩 Mana:** ${this.mana}/${this.maxMana} | **🟡 Or:** ${this.gold}/${this.maxGold}`,
                    inline: true
                },
                {
                    name: `💰 Magasin - 🔁 Rafraîchissement: ${this.refreshCost} 🟡`,
                    value: `-# ${this.shop.length ? this.shop.map((e) => e ? e.toString() : "🚫 Epuisé").join("\n-# ") : "🚫 Stock épuisé"}`
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
                value: `-# ${this.monsterEffects.map((e) => e.toString()).join("\n-# ")}`
            });
        }

        if (options?.ephemeralReplyTo) {
            await options.ephemeralReplyTo.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } else if (this.boardView && options?.edit) {
            this.boardView = await new BossleView(this, this.boardView.message).edit({ embeds: [embed] });
            await this.boardView.edit({ embeds: [embed] });
        } else if (this.channel) {
            if (this.boardView) {
                try { await this.boardView.message?.unpin(); } catch (e) { Logger.error(e) }
                if (options?.replace) {
                    await this.boardView.delete();
                } else {
                    await this.boardView?.end();
                }
            }
            this.boardView = await new BossleView(this).send(this.channel, { embeds: [embed] });
            try { await this.boardView.message?.pin(); } catch (e) { Logger.error(e) }
        }
    }

    protected serialize() {
        return {
            ...super.serialize(),
            players: Object.fromEntries(Object.entries(this.players).map(([k, v]) => [k, v.serialize()])),
            gold: this.gold,
            mana: this.mana,
            xp: this.xp,
            level: this.level,
            health: this.health,
            turnHealthChange: this.turnHealthChange,
            turnGoldChange: this.turnGoldChange,
            turnManaChange: this.turnManaChange,
            turnXPChange: this.turnXPChange,
            monster: this.monster,
            monsterEffects: this.monsterEffects.map((e) => e.constructor.name as keyof ConcreteEffects),
            targetWord: this.targetWord,
            turn: this.turn,
            shop: this.shop.map((e) => e?.serialize()),
            refreshes: this.refreshes,
            bestRun: this.bestRun,
            boardView: this.boardView?.serialize(),
            nextTimestamp: this.nextTimestamp
        }
    }

    static async load(module: Bossle, channelId: string, obj: ReturnType<BossleGame["serialize"]>): Promise<BossleGame> {
        const instance = new this(module, channelId);
        instance.players = Object.fromEntries(await Promise.all(Object.entries(obj.players).map(async ([k, v]) => [k, await BosslePlayer.load(instance, v)])));
        instance.gold = obj.gold;
        instance.mana = obj.mana;
        instance.xp = obj.xp;
        instance.level = obj.level;
        instance.health = obj.health;
        instance.turnHealthChange = obj.turnHealthChange;
        instance.turnGoldChange = obj.turnGoldChange;
        instance.turnManaChange = obj.turnManaChange;
        instance.turnXPChange = obj.turnXPChange;
        instance.monster = obj.monster;
        instance.monsterEffects = obj.monsterEffects.map((e) => new Effects[e](instance));
        if (!instance.isMonsterAlive) instance.monsterEffects.forEach((e) => e.destroy());
        instance.targetWord = obj.targetWord;
        instance.turn = obj.turn;
        instance.shop = obj.shop.map((e) => e && loadItem(instance, e));
        instance.refreshes = obj.refreshes;
        instance.bestRun = obj.bestRun;
        if (obj.boardView) instance.boardView = new BossleView(instance, await View.load(obj.boardView));
        instance.nextTimestamp = obj.nextTimestamp;
        await instance.sendBoard({ edit: true });
        instance.setupTimeout();
        return instance;
    }
}
