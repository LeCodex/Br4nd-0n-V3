import { ChatInputCommandInteraction, EmbedBuilder, Emoji } from "discord.js";
import { DateTime } from "luxon";
import { Vector2 } from "interfaces";
import { Game } from "modules/game";
import { aStar, getDist, getRankEmoji } from "utils";
import Dedalleux from ".";
import DedalleuxView from "./view";
import DedalleuxPlayer from "./player";
import View from "view";
import { shuffle } from "lodash";

export interface Wall {
    color: number,
    direction: number
}

export interface Item extends Vector2 {
    item: string
}

export default class DedalleuxGame extends Game {
    view?: DedalleuxView;
    walls: Wall[] = [];
    board: number[][] = [];
    players: Record<string, DedalleuxPlayer> = {};
    path: Vector2[] = [];
    turn = 1;
    pickedUp = 0;
    clockwiseRotation: boolean = true;
    gamerules = {};
    waitDuration = {
        minutes: 0,
        hours: 1
    };
    pawn: Vector2 = {
        x: 0,
        y: 0
    };
    goal: Vector2 = {
        x: 10,
        y: 10
    };
    items: Item[] = [];
    nextTimestamp?: DateTime;
    timeout?: NodeJS.Timeout;

    availableItems = ["🍅", "🥩", "🌶️", "🧅", "🥕", "🥑", "🥔", "🍯", "🌰", "🍍", "🌮", "🧀", "🍐", "🌭", "🥦", "🥓"];
    colors: (string | Emoji)[];

    constructor(public module: Dedalleux, channelId: string) {
        super(module, channelId);
        this.colors = Object.values(this.module.colors);
    }

    async start(interaction: ChatInputCommandInteraction) {
        this.createWalls();
        this.generateBoard();
        this.generatePath();
        this.placeItems();
        this.setupTimeout();
        await this.sendBoard();
        await this.save();
        await interaction.deferReply();
        await super.start(interaction);
    }

    generatePath() {
        this.path = aStar(this.pawn, this.goal, (pos) => this.board[pos.x]?.[pos.y] === -1);
    }

    setupTimeout(newTurn: boolean = true) {
        if (this.timeout) clearTimeout(this.timeout);

        const now = DateTime.local();
        if (!this.nextTimestamp) {
            this.nextTimestamp = now;
        }

        if (newTurn) {
            this.nextTimestamp = this.nextTimestamp.plus(this.waitDuration).set({ second: 0, millisecond: 0 });
            if (!this.waitDuration.minutes) this.nextTimestamp = this.nextTimestamp.set({ minute: 0 });
        }

        const time = this.nextTimestamp.toMillis() - now.toMillis();
        this.timeout = setTimeout(() => { this.nextTurn(time <= 0); }, time);
    }

    createWalls() {
        this.walls = [];
        const colorCount = Math.floor(this.colors.length / 2);
        for (let i = 0; i < colorCount ** 2; i++) {
            this.walls.unshift({
                color: i % colorCount,
                direction: Math.floor(Math.random() * 4)
            });
        }

        this.walls = shuffle(this.walls);
        this.walls.forEach((element, i) => {
            let d = Math.round(Math.cos(element.direction * Math.PI / 2)) + this.colors.length / 2 * Math.round(Math.sin(element.direction * Math.PI / 2));

            if (i + d >= 0 && i + d < this.walls.length) {
                let neighbor = this.walls[i + d];
                let tries = 0;
                while ((neighbor.direction + 2) % 4 === element.direction && tries < 4) {
                    element.direction = Math.floor(Math.random() * 4);
                    tries++;
                }
            }
        });
    }

    generateBoard() {
        this.board = [];
        for (let y = 0; y < this.colors.length + 1; y++) {
            this.board.push([]);
            for (let x = 0; x < this.colors.length + 1; x++) {
                this.board[y].push(-1);
            }
        }

        this.walls.forEach((element, i) => {
            const cy = Math.floor(i / (this.colors.length / 2)) * 2 + 1
            const cx = (i % Math.floor(this.colors.length / 2)) * 2 + 1;
            this.board[cy][cx] = element.color + this.colors.length / 2;
            const ry = Math.round(cy + Math.sin(element.direction * Math.PI / 2));
            const rx = Math.round(cx + Math.cos(element.direction * Math.PI / 2));
            this.board[ry][rx] = element.color;
        });
    }

    placeItems() {
        this.items = [];
        let borderItemsCount = 0;
        this.availableItems.forEach((item, i) => {
            let x: number, y : number;
            do {
                x = Math.floor(Math.random() * (this.board.length + 1) / 2) * 2;
                y = Math.floor(Math.random() * (this.board.length + 1) / 2) * 2;
            } while (
                this.items.find(e => e.x === x && e.y === y) ||
                x === 0 && y === 0 || x === this.board.length - 1 && y === this.board.length - 1 || x === 0 && y === this.board.length - 1 || x === this.board.length - 1 && y === 0 ||
                (x === 0 || y === 0 || x === this.board.length - 1 || y === this.board.length - 1) && borderItemsCount >= 4
            );

            if (x === 0 || y === 0 || x === this.board.length - 1 || y === this.board.length - 1) borderItemsCount++;
            this.items.push({ x, y, item });
        });
    }

    async sendBoard(resend: boolean = false, edit: boolean = false) {
        let embed = new EmbedBuilder()
            .setTitle(`Dédalleux • Sens de rotation des murs: ${this.clockwiseRotation ? "🔁" : "🔄"}`)
            .setFooter({ text: `Tour #${this.turn} • Nombre d'ingrédients ramassés: ${this.pickedUp}` })
            .setColor(this.module.color);

        if (Object.values(this.players).length) {
            const sorted = Object.values(this.players).sort((a, b) => b.score - a.score);
            const roundValue = Object.keys(this.players).length - sorted.reduce((acc, e) => e.gainedOnePoint ? acc + 1 : acc, -1);
            const hiddenItem = this.items.find(g => this.goal.x === g.x && this.goal.y === g.y);

            embed.addFields({
                name: `Joueurs${hiddenItem ? ` • Ingrédient caché par la cible: ${hiddenItem.item}` : ""}`,
                value: sorted.reduce((acc, e) => {
                    if (e.score < acc.lastScore) {
                        acc.lastScore = e.score;
                        acc.rank++;
                    }
                    acc.message += `${getRankEmoji(acc.rank)} **${acc.rank + 1}.** ${e.toString()}: **${e.score}**${e.gainedOnePoint ? " (+" + roundValue + ")" : ""}\n`;
                    return acc;
                }, { message: "", rank: -1, lastScore: Infinity, lastIndex: Infinity }).message
            });
        }

        embed.setDescription(this.board.map((e, ty) =>
            e.map((f, tx) => {
                if (this.pawn.x === tx && this.pawn.y === ty) return this.module.pawnEmoji.toString();
                if (this.goal.x === tx && this.goal.y === ty) return "🎯";

                let o = this.items.find(g => g.x === tx && g.y === ty);
                if (o) return o.item;

                if (this.path.find(g => g.x === tx && g.y === ty)) return "🔸";
                return f === -1 ? "⬛" : this.colors[f].toString();
            }).join("")
        ).join("\n"));

        if (this.view) {
            if (edit) {
                await this.view.edit({ embeds: [embed] });
            } else {
                await this.view.resend({ embeds: [embed] }, resend);
            }
        } else if (this.channel) {
            this.view = await new DedalleuxView(this).send(this.channel, { embeds: [embed] });
        }
    }

    async nextTurn(noSend: boolean = false) {
        Object.values(this.players).forEach((element) => { element.turnedOnce = false; element.gainedOnePoint = false; });

        let winners: DedalleuxPlayer[] = [];
        while ((this.pawn.x != this.goal.x || this.pawn.y != this.goal.y) && this.path.length) {
            this.pawn = this.path.shift()!;

            if (this.items.find(e => e.x === this.pawn.x && e.y === this.pawn.y)) this.pickedUp++;
            Object.values(this.players).forEach((element) => { if (this.pawn.x === this.items[element.item].x && this.pawn.y === this.items[element.item].y) winners.push(element) });
        }

        for (const player of winners) {
            player.gainPoints(Object.keys(this.players).length - winners.length + 1);
        }

        do {
            this.goal.x = Math.floor(Math.random() * (this.board.length + 1) / 2) * 2;
            this.goal.y = Math.floor(Math.random() * (this.board.length + 1) / 2) * 2;
        } while (getDist(this.pawn, this.goal) < 7);

        this.generatePath();
        this.turn++;
        this.clockwiseRotation = !this.clockwiseRotation;
        this.setupTimeout(true);

        if (!noSend) {
            await this.sendBoard();
            this.save();
        }
    }

    serialize() {
        return {
            ...super.serialize(),
            channel: this.channelId,
            players: Object.fromEntries(Object.entries(this.players).map(([k, v]) => [k, v.serialize()])),
            paused: this.paused,
            nextTimestamp: this.nextTimestamp?.toMillis(),
            gamerules: this.gamerules,
            turn: this.turn,
            waitDuration: this.waitDuration,
            walls: this.walls,
            pickedUp: this.pickedUp,
            clockwiseRotation: this.clockwiseRotation,
            pawn: this.pawn,
            goal: this.goal,
            items: this.items,
            view: this.view?.serialize()
        };
    }

    static async load(module: Dedalleux, channelId: string, obj:  ReturnType<DedalleuxGame["serialize"]>): Promise<Game> {
        const instance = new this(module, channelId);
        instance.players = Object.fromEntries(await Promise.all(Object.entries(obj.players).map(async ([k, v]: [string, any]) => [k, await DedalleuxPlayer.load(instance, v)])));
        instance.nextTimestamp = DateTime.fromMillis(obj.nextTimestamp ?? 0);
        instance.gamerules = obj.gamerules;
        instance.turn = obj.turn;
        instance.waitDuration = obj.waitDuration;
        instance.walls = obj.walls;
        instance.pickedUp = obj.pickedUp;
        instance.clockwiseRotation = obj.clockwiseRotation;
        instance.pawn = obj.pawn;
        instance.goal = obj.goal;
        instance.items = obj.items;
        if (obj.view) {
            instance.view = new DedalleuxView(instance, await View.load(obj.view));
        }
        instance.generateBoard();
        instance.generatePath();
        instance.setupTimeout();
        await instance.sendBoard(false, true);
        await instance.save();
        return instance;
    }
}
