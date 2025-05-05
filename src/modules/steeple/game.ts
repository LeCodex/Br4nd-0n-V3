import { DateTime, DurationLikeObject } from "luxon";
import { Game } from "modules/game";
import Tile, * as Tiles from "./tiles";
import SteeplePlayer from "./player";
import { ChatInputCommandInteraction, EmbedBuilder, Message, MessageFlags, ReactionCollector, SendableChannels, User } from "discord.js";
import { shuffle } from "lodash";
import Steeple from ".";
import { client } from "client";
import { BANNED_EMOJIS, createRankEmbed } from "utils";

type TileName = Exclude<keyof typeof Tiles, "default">;

export default class SteepleGame extends Game {
    board: Tile<any>[] = [];
    order: string[] = [];
    players: Record<string, SteeplePlayer> = {};
    summary: string[] = [];
    nextTimestamp = DateTime.local();
    turn = 1;
    timeout?: NodeJS.Timeout = undefined;
    gamerules = {};
    waitDuration: DurationLikeObject = {
        minutes: 0,
        hours: 1
    }
    collector?: ReactionCollector;

    constructor(module: Steeple, channelId: string) {
        super(module, channelId);
    }

    override async start(interaction: ChatInputCommandInteraction) {
        this.generateBoard(60);
        this.setupTimeout();
        await this.sendBoardAndSave();
        await interaction.reply({ content: "Started", flags: MessageFlags.Ephemeral });
    }

    get rankEmbed() {
        return createRankEmbed(
            {
                title: "🏆 Classement",
                color: this.module.color
            },
            "Joueurs",
            Object.values(this.players).map((e) => ({ user: e.user, score: e.rankScore, scoreStr: `**${e.score}** 🔄 | **${e.index}** 🪑` })),
            "Score"
        );
    }

    setupTimeout(newTurn = true) {
        if (this.timeout) clearTimeout(this.timeout);

        const now = DateTime.local();
        if (newTurn) {
            this.nextTimestamp = this.nextTimestamp.plus(this.waitDuration).set({ second: 0, millisecond: 0 });
            if (!this.waitDuration.minutes) this.nextTimestamp = this.nextTimestamp.set({ minute: 0 });
        }
        const time = this.nextTimestamp.toMillis() - now.toMillis();
        this.timeout = setTimeout(() => { this.throwDice() }, time);
    }

    generateBoard(size: number) {
        for (let i = 0; i < 4; i++) {
            Object.keys(Tiles).filter((e) => e !== "default").forEach((element) => this.board.push(new Tiles[element as TileName](this)));
        }

        for (let i = this.board.length; i < size; i++) {
            this.board.push(new Tiles.Chair(this));
        }

        this.board = shuffle(this.board);
    }

    private getPlayerFromUser(user: User) {
        if (!this.players[user.id]) {
            this.players[user.id] ??= new SteeplePlayer(this, user);
            this.order.push(user.id);
        }
        return this.players[user.id];
    }

    async moveOrder(interaction: ChatInputCommandInteraction, index: number = 1) {
        const player = this.getPlayerFromUser(interaction.user);
        if (player.movedThisTurn) {
            return interaction.reply({ content: "Vous avez déjà changer d'index ce tour", flags: MessageFlags.Ephemeral });
        }
        if (index < 1 || index > this.order.length) {
            return interaction.reply({ content: "Veuillez renseigner un index valide", flags: MessageFlags.Ephemeral });
        }
        if (index === 1 && this.order[0] === interaction.user.id) {
            return interaction.reply({ content: "Vous ne pouvez pas remonter en 1e place si vous y êtes déjà", flags: MessageFlags.Ephemeral });
        }
        if (this.order.indexOf(interaction.user.id) >= index - 1) {
            return interaction.reply({ content: "Vous ne pouvez spécifier qu'un index qui vous fait redescendre", flags: MessageFlags.Ephemeral });
        }

        const oldIndex = this.order.indexOf(interaction.user.id);
        if (oldIndex > -1) this.order.splice(oldIndex, 1);
        this.order.splice(index - (oldIndex > index ? 2 : 1), 0, interaction.user.id);
        await interaction.reply({ content: `Vous êtes désormais en ${index}e position`, flags: MessageFlags.Ephemeral });
        await this.sendBoardAndSave(true);
    }

    async sendBoardAndSave(edit = false, replace = false) {
        let board = "";
        const lineSize = 12;
        for (let i = 0; i < Math.ceil(this.board.length / lineSize); i++) {
            const playerColumns: string[][] = [];
            let boardLine = "";
            let maxPlayers = 0;
            for (let j = 0; j < lineSize; j++) {
                if (lineSize * i + j >= this.board.length) break;

                boardLine += this.board[lineSize * i + j].emoji.toString();
                const column = Object.values(this.players).filter(e => e.index === lineSize * i + j).map(e => e.emoji);
                playerColumns.push(column);
                maxPlayers = Math.max(maxPlayers, column.length);
            }

            for (let j = playerColumns.length; j > 0; j--) {
                if (playerColumns[j - 1].length) break;
                playerColumns.pop();
            }

            let line = "";
            for (let j = maxPlayers; j > 0; j--) line += playerColumns.map(e => e.length >= j ? e[j - 1] : "⬛").join("") + "\n";
            line += boardLine;

            board += line + "\n\n";
        }

        const embed = new EmbedBuilder()
            .setTitle("Steeple Chaise")
            .setColor(this.module.color)
            .setFooter({ text: "Tour #" + this.turn + " • Mettez une réaction à ce message pour rejoindre et changer de pion!" })

        if (this.summary.length) {
            let totalLength = 0;
            const field = {
                name: "Résumé du dernier lancer",
                value: ""
            }
            this.summary.forEach((element, i) => {
                totalLength += (element + "\n").length;
                if (totalLength >= 1024) {
                    embed.addFields(field);
                    field.value = "";
                    field.name = "Suite du résumé"
                    totalLength = (element + "\n").length;
                }
                field.value += element + "\n";
            });
            if (field.value.trim().length) embed.addFields(field);
        }

        const activeEffects = Object.values(this.players).filter(e => e.effects.length).map(e => e.toString() + ": " + e.effects.map(f => f.name).join(", ")).join("\n")
        if (activeEffects.length) {
            embed.addFields({
                name: "Effets actifs",
                value: activeEffects
            });
        }

        const nbPlayersPerLine = 2;
        if (this.order.length) {
            const field = {
                name: "Ordre",
                value: ""
            }
            this.order.forEach((e, i) => {
                const string = (i + 1) + "․ " + (this.players[e].movedThisTurn ? "" : "__") + this.players[e].toString() + (this.players[e].movedThisTurn ? "" : "__") + ((i + 1) % nbPlayersPerLine === 0 ? "\n" : " | ")

                if (field.value.length + string.length >= 1024) {
                    embed.addFields(field);
                    field.value = "";
                    field.name = "Suite de l'ordre"
                }

                field.value += string;
            });
            if (field.value.trim().length) embed.addFields(field);
        }

        embed.addFields({ name: "Plateau", value: board });

        if (edit && this.collector) {
            await this.collector.message.edit({ embeds: [embed] });
        } else {
            if (replace && this.collector) {
                await this.collector.message.delete();
            }
            const message = await this.channel?.send({ embeds: [embed] });
            if (message) {
                this.setupCollector(message);
            }
        }

        await this.save();
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
                await this.sendBoardAndSave(true);
            }
        });
    }

    async throwDice() {
        const diceResult = Math.floor(Math.random() * this.order.length);
        this.summary.length = 0;

        this.order.forEach((id) => {
            this.players[id].doTurn(diceResult);
            this.players[id].movedThisTurn = false;
            this.summary.push("");
        });

        this.order.forEach(element => {
            const player = this.players[element];
            player.effects.forEach((effect) => {
                effect.throwEnd(player);
            });
        });

        this.turn++;
        this.setupTimeout();
        await this.sendBoardAndSave();
    }

    protected serialize() {
        return {
            ...super.serialize(),
            board: this.board.map((e) => e.serialize()),
            order: this.order,
            players: Object.fromEntries(Object.entries(this.players).map(([k, v]) => [k, v.serialize()])),
            summary: this.summary,
            nextTimestamp: this.nextTimestamp.toMillis(),
            turn: this.turn,
            gamerules: this.gamerules,
            waitDuration: this.waitDuration,
            message: this.collector?.message.id,
        }
    }

    static async load(module: Steeple, channelId: string, obj: ReturnType<SteepleGame["serialize"]>): Promise<SteepleGame> {
        const instance = new this(module, channelId);
        instance.board = obj.board.map((e) => new Tiles[e.cls as TileName](instance, e.data));
        instance.order = obj.order;
        instance.players = Object.fromEntries(await Promise.all(Object.entries(obj.players).map(async ([k, v]) => [k, await SteeplePlayer.load(instance, v)])));
        instance.summary = obj.summary;
        instance.nextTimestamp = DateTime.fromMillis(obj.nextTimestamp) as DateTime<true>;
        instance.turn = obj.turn;
        instance.gamerules = obj.gamerules;
        instance.waitDuration = obj.waitDuration;
        instance.setupTimeout();

        const message = obj.message && await (await client.channels.fetch(channelId) as SendableChannels).messages.fetch(obj.message)
        if (message) {
            instance.setupCollector(message);
        } else {
            await instance.sendBoardAndSave();
        }
        return instance;
    }
}
