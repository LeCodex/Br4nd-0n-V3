import { ChatInputCommandInteraction, MessageFlags, RepliableInteraction } from "discord.js";
import { Game } from "modules/game";
import * as Balls from "./ball";
import BingoidPlayer from "./player";
import { call, randomlyPick } from "utils";
import { range, uniq } from "lodash";
import Bingoid from ".";
import { BingoidCard, Tile } from "./card";

type ConcreteBalls = Omit<typeof Balls, "default">;

export class RollContext {
    onBingo: Array<() => void> = [];
    postMark: Array<() => void> = [];
    newlyMarkedPoints = 3;
    alreadyMarkedPoints = 1;
    notOnCardPoints = 0;
    rowColumnBingoPoints = 5;
    diagonalBingoPoints = 10;
    cornerBingoPoints = 15;
    cardStaysOnBingo = false;

    constructor(public player: BingoidPlayer, public roll: number) {}
}

interface HistoryElement {
    player: BingoidPlayer;
    roll: number;
}

export default class BingoidGame extends Game {
    players: Record<string, BingoidPlayer> = {};
    ballAmount = 5;
    balls: Array<Balls.default> = [];
    historyMaxLength = 5;
    history: Array<HistoryElement> = [];
    cardSize = 4;
    maxNumber = 20;
    card = new BingoidCard(this.cardSize, this.maxNumber);
    summary: Array<string> = [];
    ballClasses = Object.entries(Balls).filter(([k]) => k !== "default").map(([_, v]) => v);
    lastRolledBy: Partial<Record<number, BingoidPlayer>> = {};

    async start(interaction: ChatInputCommandInteraction): Promise<void> {
        for (let i = 0; i < this.ballAmount; i++) {
            this.balls.push(this.getRandomBall());
        }
        await this.sendBoardAndSave(interaction);
    }

    public async takeBall(interaction: ChatInputCommandInteraction) {
        const player = this.players[interaction.user.id] ??= new BingoidPlayer(this, interaction.user);
        if (false &&this.history.slice(0, 2).map(e => e.player).includes(player)) {
            return await interaction.reply({ content: "Veuillez attendre que les autres joueurs jouent", flags: MessageFlags.Ephemeral });
        }

        const roll = Math.floor(Math.random() * 20) + 1;
        const ball = this.balls.shift();
        if (!ball) return;
        this.balls.push(this.getRandomBall());

        this.summary.length = 0;
        this.summary.push(`▶️ ${player} tire la **${ball}** avec un **${roll}** dessus`);
        const context = new RollContext(player, roll);
        ball.take(context);

        this.markTile(context);
        context.postMark.forEach(call);
        this.checkBingo(context);
        this.pushToHistory({ player: context.player, roll: context.roll });
        this.lastRolledBy[context.roll] = context.player;

        await this.sendBoardAndSave(interaction);
    }

    public markTile(context: RollContext, roll: number = context.roll, player: BingoidPlayer = context.player) {
        const tile = this.getTileWithNumber(roll);
        if (!tile) {
            this.summary.push(`🧂 Le **${roll}** n'est pas sur la fiche...`);
            player.salt++;
            player.scorePoints(context.notOnCardPoints);
        } else if (!tile.marked) {
            tile.marked = player;
            this.summary.push(`✅ ${player} marque le **${roll}**!`);
            player.scorePoints(context.newlyMarkedPoints);
        } else {
            this.summary.push(`🔁 Le **${roll}** était déjà marqué`);
            player.scorePoints(context.alreadyMarkedPoints);
        }
    }

    public async sendBoardAndSave(interaction: RepliableInteraction) {
        let card = "";
        for (const row of this.card) {
            for (const tile of row) {
                const numStr = tile.number.toString().padStart(2, '0')
                card += tile.marked ? `(*${numStr}*)` : `[ ${numStr} ]`;
            }
            card += "\n";
        }
        card += "\n";

        for (const player of Object.values(this.players).sort((a, b) => b.score - a.score)) {
            const marked = this.card.flat().filter((e) => e.marked === player);
            const markedStr = marked.length ? ` (${marked.map((e) => e.number).join(", ")})` : "";
            card += `${player.user.displayName} : ${player.score}${markedStr}`;
        }

        const fields = [
            { name: "Grille", value: `\`\`\`${card}\`\`\`` },
            { name: "Boules", value: this.balls.map((e) => e.emoji).join("")}
        ];
        if (this.summary.length) fields.unshift({ name: "Résumé du tirage", value: this.summary.join("\n") });

        await interaction.reply({ embeds: [{ title: "Bingoid", color: this.module.color, fields }] });
        await this.save();
    };

    public pushToHistory(element: typeof this.history[number]) {
        this.history.unshift(element);
        if (this.history.length > this.historyMaxLength) this.history.pop();
    }

    public getTileWithNumber(number: number) {
        for (const row of this.card) {
            for (const tile of row) {
                if (tile.number === number) {
                    return tile;
                }
            }
        }
        return undefined;
    }

    public markedBy(number: number) {
        return this.getTileWithNumber(number)?.marked;
    }

    public cantMark(number: number) {
        const tile = this.getTileWithNumber(number)
        return !tile || tile.marked;
    }

    public getRandomBall() {
        const ballClass = randomlyPick(this.ballClasses) as ConcreteBalls[keyof ConcreteBalls];
        return new ballClass(this);
    }

    private generateCard() {
        this.card = new BingoidCard(this.cardSize, this.maxNumber);
    }

    private checkIfAllMarkedAndScore(tiles: Array<Tile>, message: string, score: number) {
        for (const tile of tiles) {
            if (!tile.marked) return false;
        }
        this.summary.push(message);
        for (const player of uniq(tiles.map((e) => e.marked))) {
            player?.scorePoints(score);
        }
        return true;
    }

    private checkBingo(context: RollContext) {
        let newBingo = false;
        const cardRange = range(this.cardSize);
        for (let i = 0; i < this.cardSize; i++) {
            if (!this.card.rowBingos[i])
                newBingo ||= this.card.rowBingos[i] = this.checkIfAllMarkedAndScore(cardRange.map((j) => this.card[i][j]), `**➡️ La ligne ${i + 1} a un bingo!**`, context.rowColumnBingoPoints);

            if (!this.card.columnBingos[i])
                newBingo ||= this.card.columnBingos[i] = this.checkIfAllMarkedAndScore(cardRange.map((j) => this.card[j][i]), `**⬇️ La colonne ${i + 1} a un bingo!**`, context.rowColumnBingoPoints);
        }
        if (!this.card.uldrBingo)
            newBingo ||= this.card.uldrBingo = this.checkIfAllMarkedAndScore(cardRange.map((i) => this.card[i][i]), `**↘️ La diagonale a un bingo!**`, context.diagonalBingoPoints);

        if (!this.card.urdlBingo)
            newBingo ||= this.card.urdlBingo = this.checkIfAllMarkedAndScore(cardRange.map((i) => this.card[i][this.cardSize - i - 1]), `**↙️ La diagonale a un bingo!**`, context.diagonalBingoPoints);

        const corners = [this.card[0][0], this.card[0][this.cardSize - 1], this.card[this.cardSize - 1][0], this.card[this.cardSize - 1][this.cardSize - 1]];
        if (!this.card.cornerBingo)
            newBingo ||= this.card.cornerBingo = this.checkIfAllMarkedAndScore(corners, `**🔄 Les coins ont un bingo!**`, context.cornerBingoPoints);

        if (newBingo) {
            context.onBingo.forEach(call);
            if (!context.cardStaysOnBingo && !this.card.allBingos) {
                this.summary.push("✨ Une nouvelle grille a été tirée");
                this.generateCard();
            }
        }
    }

    protected serialize() {
        return {
            ...super.serialize(),
            players: Object.fromEntries(Object.entries(this.players).map(([k, v]) => [k, v.serialize()])),
            ballAmount: this.ballAmount,
            balls: this.balls.map(e => e.serialize()),
            historyMaxLength: this.historyMaxLength,
            history: this.history.map((e) => ({ ...e, player: e.player.user.id })),
            cardSize: this.cardSize,
            maxNumber: this.maxNumber,
            card: this.card.serialize(),
            summary: this.summary,
            lastRolledBy: Object.fromEntries(Object.entries(this.lastRolledBy).map(([k, v]) => [k, v!.user.id])),
        };
    }

    static async load(module: Bingoid, channelId: string, obj: ReturnType<BingoidGame["serialize"]>): Promise<BingoidGame> {
        const instance = new this(module, channelId);
        instance.paused = obj.paused;
        instance.players = Object.fromEntries(await Promise.all(Object.entries(obj.players).map(async ([k, v]) => [k, await BingoidPlayer.load(instance, v)])));
        instance.ballAmount = obj.ballAmount;
        instance.balls = obj.balls.map(e => new Balls[e.cls as keyof ConcreteBalls](instance));
        instance.historyMaxLength = obj.historyMaxLength;
        instance.history = obj.history.map((e) => ({ ...e, player: instance.players[e.player] }));
        instance.cardSize = obj.cardSize;
        instance.maxNumber = obj.maxNumber;
        instance.card = BingoidCard.load(instance, obj.card);
        instance.summary = obj.summary;
        instance.lastRolledBy = Object.fromEntries(Object.entries(obj.lastRolledBy).map(([k, v]) => [k, instance.players[v]]));
        return instance;
    }
}