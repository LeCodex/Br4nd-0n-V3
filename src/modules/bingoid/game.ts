import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Game } from "modules/game";
import * as Balls from "./ball";
import BingoidPlayer from "./player";
import { randomlyPick } from "utils";
import { range, shuffle } from "lodash";

export default class BingoidGame extends Game {
    players: Record<string, BingoidPlayer> = {};
    balls: Array<Balls.default> = [];
    ballAmount = 5;
    history: Array<string> = [];
    card: Array<Array<{ number: number, marked: string | undefined }>> = [];
    cardSize = 4;
    maxNumber = 20;
    summary: Array<string> = [];
    ballClasses = Object.entries(Balls).filter(([k]) => k !== "default").map(([_, v]) => v);

    async start(interaction: ChatInputCommandInteraction): Promise<void> {
        for (let i = 0; i < this.ballAmount; i++) {
            this.pushNewBall();
        }

        await interaction.reply({ content: "Started", flags: MessageFlags.Ephemeral }); 
    }

    public async takeBall(interaction: ChatInputCommandInteraction) {
        const player = this.players[interaction.user.id] ??= new BingoidPlayer(this, interaction.user);
        const roll = Math.floor(Math.random() * 20) + 1;
        const ball = this.balls.shift();
        if (!ball) return;
        this.summary.push(`${ball.emoji} ${player} tire la ${ball} avec un ${roll} dessus`);
        ball.take(player, roll);

        let found = false;
        for (const row of this.card) {
            for (const tile of row) {
                if (tile.number === roll) {
                    if (!tile.marked) {
                        tile.marked = player.user.id;
                        this.summary.push(`✅ ${player} marque le ${roll}!`);
                        player.scorePoints(3);
                    } else {
                        this.summary.push(`🔁 Le ${roll} était déjà marqué`);
                        player.scorePoints(1);
                    }
                    found = true;
                }
            }
        }
        if (!found) {
            this.summary.push(`🧂 Le ${roll} n'est pas sur la fiche...`);
            player.salt++;
        }
        this.checkBingo();
        this.pushNewBall();

        await this.sendBoardAndSave(interaction);
    }

    public isOnCard(number: number) {
        for (const row of this.card) {
            for (const tile of row) {
                if (tile.number === number) {
                    return true;
                }
            }
        }
        return false;
    }

    public markedBy(number: number) {
        for (const row of this.card) {
            for (const tile of row) {
                if (tile.number === number) {
                    return tile.marked;
                }
            }
        }
        return undefined;
    }

    private generateCard() {
        const numbers = shuffle(range(1, this.maxNumber + 1));
        this.card = range(this.cardSize).map((_) => range(this.cardSize).map((_) => ({ number: numbers.pop()!, marked: undefined })))
    }

    private checkBingo() {
        let ludrDiagonal = true;
        let rudlDiagonal = true;
        let cleared = false;
        for (let i = 0; i < this.cardSize; i++) {
            if (!this.card[i][i].marked) ludrDiagonal = false;
            if (!this.card[i][this.cardSize - i].marked) rudlDiagonal = false;
            
            let row = true;
            let column = true;
            for (let j = 0; j < this.cardSize; j++) {
                if (!this.card[i][j].marked) row = false;
                if (!this.card[j][i].marked) column = false;
            }
            if (row) {
                this.summary.push(`➡ La ligne ${i+1} a un bingo!`);
                for (let j = 0; j < this.cardSize; j++) this.players[this.card[i][j].marked!].scorePoints(5);
                cleared = true;
            }
            if (column) {
                this.summary.push(`⬇ La colonne ${i+1} a un bingo!`);
                for (let j = 0; j < this.cardSize; j++) this.players[this.card[i][j].marked!].scorePoints(5);
                cleared = true;
            }
        }
        if (ludrDiagonal) {
            this.summary.push(`↘ La diagonale a un bingo!`);
            for (let i = 0; i < this.cardSize; i++) this.players[this.card[i][i].marked!].scorePoints(10);
            cleared = true;
        }
        if (rudlDiagonal) {
            this.summary.push(`↙ La diagonale a un bingo!`);
            for (let i = 0; i < this.cardSize; i++) this.players[this.card[i][this.cardSize - i].marked!].scorePoints(10);
            cleared = true;
        }

        if (cleared) {
            this.summary.push("✨ Une nouvelle carte a été tirée");
            this.generateCard();
        }
    }

    private pushNewBall() {
        const ballClass = randomlyPick(this.ballClasses) as Omit<typeof Balls, "default">[keyof Omit<typeof Balls, "default">];
        this.balls.push(new ballClass(this));
    }
}