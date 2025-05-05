import { Game } from "modules/game";
import ChaisesPlayer from "./player";
import { APIEmbedField, ChatInputCommandInteraction, Message, MessageFlags, ReactionCollector, RepliableInteraction, SendableChannels, User } from "discord.js";
import Chaises from ".";
import { client } from "client";
import { BANNED_EMOJIS, createRankEmbed, getRankEmoji } from "utils";

export default class ChaisesGame extends Game {
    players: Record<string, ChaisesPlayer> = {};
    boardMessage?: Message;
    title?: string;
    message?: string;
    previousPlayers: Array<string> = [];
    waitAmount = 2;
    chairs: Array<string | undefined> = [];
    collector?: ReactionCollector;

    constructor(module: Chaises, channelId: string) {
        super(module, channelId);
    }

    getPlayerFromUser(user: User) {
        return this.players[user.id] ??= new ChaisesPlayer(this, user);
    }

    async start(interaction: ChatInputCommandInteraction) {
        for (let i = 0; i < 50; i++) this.chairs.push(undefined);
        await this.sendBoardAndSave({ interaction, title: "Début de partie" });
    }

    async sendBoardAndSave(options?: { interaction?: RepliableInteraction, title?: string, message?: string, edit?: boolean }) {
        if (options?.title) this.title = options.title;
        if (options?.message) this.message = options.message;

        let board = this.message ? `${this.message}\n\n` : "";
        let line = "", i = 0;
        const lineLength = 10;
        for (const chair of this.chairs) {
            line += chair ? this.players[chair].emoji : "🪑";
            i++;
            if (i >= lineLength) {
                board += line + "\n";
                line = "";
                i = 0;
            }
        }

        const embed = createRankEmbed(
            { description: board, color: this.module.color, title: `[TASSES MUSICALES] ${this.title ?? ""}` },
            "Joueurs",
            Object.values(this.players).map((e) => ({ user: e.user, playerStr: `${e.emoji} ${e.user.toString()}`, score: [e.score, e.chairs], scoreStr: `**${e.score}** 🏅 | **${e.chairs}** 🪑` })),
            "Score"
        )

        // Render last players
        embed.fields?.push({
            name: "Derniers joueurs",
            value: this.previousPlayers.map(e => this.players[e].toString()).join(", ")
        });

        if (options?.edit && this.boardMessage) {
            this.boardMessage.edit({ embeds: [embed] });
        } else {
            this.boardMessage = options?.interaction
                ? (await options.interaction.reply({ embeds: [embed], withResponse: true })).resource?.message ?? undefined
                : await this.channel?.send({ embeds: [embed] });
        }
        if (this.boardMessage) this.setupCollector(this.boardMessage);
        await this.save();
    }

    markChair(index: number, player: ChaisesPlayer) {
        // Mark the player as having played
        this.previousPlayers.push(player.user.id);
        if (this.previousPlayers.length > this.waitAmount) this.previousPlayers.shift();

        if (!this.chairs[index]) {
            // Just place the cutout in the chair
            this.chairs[index] = player.user.id;
            return true;
        } else if (this.chairs[index] == player.user.id) {
            // Burn all the cutouts
            this.chairs = this.chairs.map(e => e == player.user.id ? undefined : e);
            return false;
        } else {
            // Replace the cutout and give a point
            this.players[this.chairs[index]].score++;
            this.chairs[index] = player.user.id;
            return true;
        }
    }

    async resendMessage() {
        await this.boardMessage?.delete();
        await this.sendBoardAndSave();
    }

    private setupCollector(message: Message) {
        if (this.collector) {
            this.collector.stop();
            delete this.collector;
        }

        this.collector = message.createReactionCollector({ dispose: true });
        this.collector.on('collect', async (reaction, user) => {
            await reaction.users.remove(user);
            if (this.paused) return;
            const player = this.getPlayerFromUser(user);
            if (!BANNED_EMOJIS.includes(reaction.emoji.toString())) {
                player.emoji = reaction.emoji.toString();
                await this.sendBoardAndSave({ edit: true });
            }
        });
    }

    protected serialize() {
        return {
            ...super.serialize(),
            players: Object.fromEntries(Object.entries(this.players).map(([k, v]) => [k, v.serialize()])),
            boardMessage: this.boardMessage?.id,
            title: this.title,
            message: this.message,
            previousPlayers: this.previousPlayers,
            waitAmount: this.waitAmount,
            chairs: this.chairs
        }
    }

    static async load(module: Chaises, channelId: string, obj: ReturnType<ChaisesGame["serialize"]>): Promise<ChaisesGame> {
        const instance = new this(module, channelId);
        instance.previousPlayers = obj.previousPlayers;
        instance.waitAmount = obj.waitAmount;
        instance.chairs = obj.chairs;
        instance.players = Object.fromEntries(await Promise.all(Object.entries(obj.players).map(async ([k, v]) => [k, await ChaisesPlayer.load(instance, v)])))
        instance.title = obj.title;
        instance.message = obj.message;
        if (obj.boardMessage) {
            instance.boardMessage = await (await client.channels.fetch(channelId) as SendableChannels).messages.fetch(obj.boardMessage);
        }
        await instance.sendBoardAndSave({ edit: true });
        return instance;
    }
}