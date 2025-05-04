import { Game } from "modules/game";
import ChaisesPlayer from "./player";
import { ChatInputCommandInteraction, Message, MessageFlags, SendableChannels } from "discord.js";
import Chaises from ".";
import { client } from "client";

export default class ChaisesGame extends Game {
    players: Record<string, ChaisesPlayer> = {};
    boardMessage?: Message;
    previousPlayers: Array<string> = [];
    waitAmount = 2;
    chairs: Array<string | undefined> = [];

    constructor(module: Chaises, channelId: string) {
        super(module, channelId);
    }

    async start(interaction: ChatInputCommandInteraction) {
        for (let i = 0; i < 50; i++) this.chairs.push(undefined);
        await this.sendBoardAndSave();
        await interaction.reply({ content: "Started", flags: MessageFlags.Ephemeral })
    }

    async sendBoardAndSave() {
        let message = "";
        const columns: Array<Array<string>> = [];
        let rowCount = 0
        const maxRowCount = 5;
        for (let i = 0; i < maxRowCount; i++) columns.push([]);

        // Store columns
        const maxIndexLength = String(this.chairs.length-1).length;
        this.chairs.forEach((chair, i) => {
            const indexString = (i+1).toString().padStart(maxIndexLength, "0");
            const placeString = chair ? this.players[chair].toString() : "..." 
            columns[rowCount].push(`[${indexString}] ${placeString}`);
            rowCount = (rowCount + 1) % maxRowCount;
        });

        // Render chairs with padding
        rowCount = 0;
        let i = 0;
        const columnsMaxLengths = columns.map(e => e.reduce((acc, str) => Math.max(acc, str.length), 0));
        while (i < columns[rowCount].length) {
            const tileString = columns[rowCount][i];
            message += tileString;

            if (++rowCount == maxRowCount) {
                rowCount = 0; i++;
                message += "\n";
            } else {
                const padding = columnsMaxLengths[rowCount-1] - tileString.length;
                if (padding > 0) message += " ".repeat(padding);
                message += " | ";
            };
        }

        // Render scores
        message += "\n- SCORES -\n";
        const playersByScore: Record<number, Array<ChaisesPlayer>> = {};
        let maxScore = 0;
        for (const player of Object.values(this.players)) {
            if (!playersByScore[player.score]) playersByScore[player.score] = [];
            if (maxScore < player.score) maxScore = player.score;
            playersByScore[player.score].push(player);
        }

        for (let i = maxScore; i > 0; i--) {
            if (playersByScore[i]) {
                message += `${i}. ${playersByScore[i].map(e => e.toString()).join(", ")}\n`;
            }
        }

        // Render last players
        message += "\n- DERNIERS JOUEURS -\n";
        message += this.previousPlayers.map(e => this.players[e].toString()).join(", ");

        message = "```\n" + message + "```";
        this.boardMessage = await this.channel?.send(message);
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

    protected serialize() {
        return {
            ...super.serialize(),
            players: Object.fromEntries(Object.entries(this.players).map(([k, v]) => [k, v.serialize()])),
            boardMessage: this.boardMessage?.id,
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
        if (obj.boardMessage) {
            instance.boardMessage = await (await client.channels.fetch(channelId) as SendableChannels).messages.fetch(obj.boardMessage);
        }
        return instance;
    }
}