import { Game } from "modules/game";
import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import TartilettresPlayer from "./player";
import Tartilettres from ".";

export default class TartilettresGame extends Game {
    readonly letters: string[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    players: Record<string, TartilettresPlayer> = {};
    lastPlayed: string = "";
    saidWords: string[] = [];
    wordLength: number = 7;
    declare module: Tartilettres;

    constructor(module: Tartilettres, channelId: string) {
        super(module, channelId);
    }

    public async sendWord(interaction: ChatInputCommandInteraction) {
        const player = this.players[interaction.user.id] ??= new TartilettresPlayer(this, interaction.user);
        const word = interaction.options.get("mot")?.value
        if (!word || typeof word !== "string") {
            return interaction.reply({ content: "Veuillez rensigner un mot valide", flags: MessageFlags.Ephemeral });
        }
        return player.playWord(word, interaction);
    }

    public async sendTable(interaction: ChatInputCommandInteraction) {
        const maxLength = Object.values(this.players).reduce((acc, e) => Math.max(acc, e.user.displayName.length), 0);
        const sorted = Object.values(this.players).sort((a, b) => b.score - a.score);
        await interaction.reply(
            `\`\`\`\nLongueur attendue: ${this.wordLength} lettres\n${sorted.map(e =>
                `${e.user.displayName}${" ".repeat(maxLength - e.user.displayName.length + 1)}: `
                + `${this.letters.map(l => e.letters[l] ? "_" : l).join("")} (${e.score})`
                + `${e.taboo.length ? "  ❌ " + e.taboo.join(",") : ""}`
            ).join("\n")}\`\`\``
        );
    }

    async nextTurn(interaction?: ChatInputCommandInteraction) {
        this.wordLength = Math.floor(Math.random() * 6) + 5;
        if (interaction) {
            this.lastPlayed = interaction.user.id;
            if (interaction) await this.sendTable(interaction);
        }
        await this.save();
    }

    serialize() {
        return {
            ...super.serialize(),
            players: Object.fromEntries(Object.entries(this.players).map(([k, v]) => [k, v.serialize()])),
            lastPlayed: this.lastPlayed,
            wordLength: this.wordLength,
            saidWords: this.saidWords
        };
    }

    static async load(module: Tartilettres, channelId: string, obj: Record<string, any>): Promise<TartilettresGame> {
        const instance = new this(module, channelId);
        instance.paused = obj.paused;
        instance.lastPlayed = obj.lastPlayed;
        instance.wordLength = obj.wordLength ?? 7;
        instance.saidWords = obj.saidWords ?? [];
        instance.players = Object.fromEntries(await Promise.all(Object.entries(obj.players).map(async ([k, v]: [string, any]) => [k, await TartilettresPlayer.load(module, instance, v)])));
        return instance;
    }
}
