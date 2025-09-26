import { Game } from "modules/game";
import { Figure, figures } from "./figures";
import YamJamPlayer from "./player";
import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import YamJamView from "./view";
import { getRankEmoji } from "utils";
import View from "view";
import YamJam from ".";

export default class YamJamGame extends Game {
    scoreCategories: Record<string, Figure> = {
        sum1: { name: "Somme des 1", count: (player) => player.tray.filter(e => e === 0).length },
        sum2: { name: "Somme des 2", count: (player) => player.tray.filter(e => e === 1).length * 2 },
        sum3: { name: "Somme des 3", count: (player) => player.tray.filter(e => e === 2).length * 3 },
        sum4: { name: "Somme des 4", count: (player) => player.tray.filter(e => e === 3).length * 4 },
        sum5: { name: "Somme des 5", count: (player) => player.tray.filter(e => e === 4).length * 5 },
        sum6: { name: "Somme des 6", count: (player) => player.tray.filter(e => e === 5).length * 6 }
    }
    players: Record<string, YamJamPlayer> = {};
    lastPlayed: string = "";
    dice: number[] = [];
    view?: YamJamView;

    lastTimestamp = 0;
    timeout?: NodeJS.Timeout | undefined;

    constructor(public module: YamJam, channelId: string) {
        super(module, channelId);
    }

    async start(interaction: ChatInputCommandInteraction) {
        this.rerollEverything();

        const keys = Object.keys(figures);
        for (let i = 0; i < 6; i++) {
            const key = keys.splice(Math.floor(Math.random() * keys.length), 1)[0]!;
            this.scoreCategories[key] = figures[key]!;
        }
        this.scoreCategories.chance = {name: "Chance (Somme des dés)", count: (player) => player.tray.reduce((a, e) => a + e + 1, 0)}

        await this.sendMessage();
        await super.start(interaction);
    }

    resetTimeout() {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => this.rerollEverything(), this.lastTimestamp + 3600000 - Date.now());
    }

    async rerollEverything() {
        this.dice = [];
        for (let i = 0; i < 3; i++) {
            this.dice.push(Math.floor(Math.random() * 6));
        }

        this.lastTimestamp = Date.now();
        this.lastPlayed = "";
        this.resetTimeout();
        await this.sendMessage(true);
        await this.save();
    }

    async sendMessage(resend = false) {
        const embed = new EmbedBuilder()
            .setTitle("[YAMS] Dés disponibles" + (this.lastPlayed ? " | Dernier dé pris par " + this.players[this.lastPlayed]!.user.displayName : ""))
            .setDescription(this.dice.map(e => this.module.faces[e]).join(""))
            .setColor(this.module.color)

        if (Object.values(this.players).length) {
            const sorted = Object.values(this.players).sort((a, b) => b.score - a.score);
            const value = sorted.reduce((acc, e) => {
                if (e.score < acc.lastScore) {
                    acc.lastScore = e.score;
                    acc.rank++;
                }
                acc.message.push(
                    `${getRankEmoji(acc.rank)} **${acc.rank + 1}.** ${this.lastPlayed === e.user.id ? "__" : ""}${e.user ? e.user.toString() : "Joueur non trouvé"}` +
                    `${this.lastPlayed === e.user.id ? "__" : ""}: **${e.score}** ${e.pointsGained > 0 ? " (+" + e.pointsGained + ")" : ""} | ` +
                    `${e.tray.map(e => this.module.faces[e]).join("")}`
                );
                return acc;
            }, { message: [] as string[], rank: -1, lastScore: Infinity, lastIndex: Infinity }).message;

            let totalLength = 0;
            const field = {
                name: "Joueurs",
                value: ""
            }
            value.forEach((element, i) => {
                totalLength += (element + "\n").length;
                if (totalLength >= 1024) {
                    embed.addFields({ ...field });
                    field.value = "";
                    field.name = "Suite des joueurs"
                    totalLength = (element + "\n").length;
                }
                field.value += element + "\n";
            });
            if (field.value.trim().length) embed.addFields(field);
        }

        if (this.view?.message) {
            this.view = await new YamJamView(this, this.view.message)[resend ? "resend" : "edit"]({ embeds: [embed] });
        } else if (this.channel) {
            this.view = await new YamJamView(this).send(this.channel, { embeds: [embed] });
        }
    }

    serialize() {
        return {
            ...super.serialize(),
            channel: this.channelId,
            players: Object.fromEntries(Object.entries(this.players).map(([k, v]) => [k, v.serialize()])),
            dice: this.dice,
            lastPlayed: this.lastPlayed,
            lastTimestamp: this.lastTimestamp,
            scoreCategories: Object.keys(this.scoreCategories),
            view: this.view?.serialize(),
        };
    }

    static async load(module: YamJam, channelId: string, obj: ReturnType<YamJamGame["serialize"]>): Promise<YamJamGame> {
        const instance = new this(module, channelId);
        instance.players = Object.fromEntries(await Promise.all(Object.entries(obj.players).map(async ([k, v]) => [k, await YamJamPlayer.load(instance, v)])));
        instance.dice = obj.dice;
        instance.lastPlayed = obj.lastPlayed;
        instance.lastTimestamp = obj.lastTimestamp;

        const scoreCategoriesKeys = obj.scoreCategories;
        for (const key of scoreCategoriesKeys) {
            if (figures[key]) instance.scoreCategories[key] = figures[key];
        }
        instance.scoreCategories.chance = {name: "Chance (Somme des dés)", count: (player) => player.tray.reduce((a, e) => a + e + 1, 0)}

        if (obj.view) {
            instance.view = new YamJamView(instance, await View.load(obj.view));
        }
        await instance.sendMessage();
        instance.resetTimeout();
        await instance.sendMessage();
        return instance;
    }
}
