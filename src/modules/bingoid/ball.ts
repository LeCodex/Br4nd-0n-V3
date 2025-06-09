import { getEmoji, randomlyPick } from "utils";
import BingoidGame, { RollContext } from "./game";
import { Emoji } from "discord.js";
import { shuffle } from "lodash";

export default abstract class Ball {
    emoji: string | Emoji;
    abstract name: string;

    constructor(public game: BingoidGame, id: string, fallback: string) {
        this.emoji = fallback;
        getEmoji(id, fallback).then(e => { this.emoji = e; });
    }

    abstract take(context: RollContext): void;

    toString() {
        return `${this.emoji} ${this.name}`;
    }

    serialize() {
        return {
            cls: this.constructor.name
        };
    }
}

export class ClassicBall extends Ball {
    name = "Boule Classique";

    constructor(game: BingoidGame) {
        super(game, "bjaune", "🟡");
    }

    take(context: RollContext) {
        this.game.summary.push(`${this.emoji} La boule n'a aucun effet particulier`);
    }
}

export class RussianBall extends Ball {
    name = "Boule Russe";

    constructor(game: BingoidGame) {
        super(game, "brouge", "🔴");
    }

    take(context: RollContext): void {
        this.game.summary.push(`${this.emoji} ${context.player} lance la **${this.name}**!`);
        context.player.scorePoints([1, 1, -1][Math.floor(Math.random() * 3)]);
    }
}

export class ErasableBall extends Ball {
    name = "Boule Effaçable";

    constructor(game: BingoidGame) {
        super(game, "borange", "🟠");
    }

    take(context: RollContext): void {
        if (this.game.cantMark(context.roll)) {
            const newRoll = Math.floor(Math.random() * 20) + 1;
            this.game.summary.push(`${this.emoji} ${context.player} a effacé le **${context.roll}** pour y marquer un **${newRoll}**!`);
            if (this.game.cantMark(newRoll)) {
                this.game.summary.push(`${this.emoji} Le **${newRoll}** n'est toujours pas cochable!`);
                context.player.scorePoints(-1);
            }
            this.game.summary.push(`${this.emoji} ${context.player} a effacé le **${context.roll}** pour y marquer un **${newRoll}**!`);
            context.roll = newRoll;
        } else {
            this.game.summary.push(`${this.emoji} Pas besoin de remplacer le **${context.roll}**`);
        }
    }
}

export class FacetedBall extends Ball {
    name = "Boule à Facettes";

    constructor(game: BingoidGame) {
        super(game, "bblanc", "⚪");
    }

    take(context: RollContext): void {
        this.game.summary.push(`${this.emoji} Un bingo rapportera **5 points bonus**!`);
        context.onBingo.push(() => {
            this.game.summary.push(`${this.emoji} Un bingo est arrivé!`);
            context.player.scorePoints(5);
        });
    }
}

export class PetanqueBall extends Ball {
    name = "Boule de Pétanque";

    constructor(game: BingoidGame) {
        super(game, "bgris", "⚫");
    }

    take(context: RollContext): void {
        const cantMark = this.game.cantMark(context.roll);
        context.postMark.push(() => {
            const other = this.game.history[0]?.player;
            if (cantMark && other) {
                this.game.summary.push(`${this.emoji} La **${this.name}** a tapé ${other}!`);
                context.player.steal(other, 1);
            } else {
                this.game.summary.push(`${this.emoji} ${context.player} a coché un numéro`);
            }
        })
    }
}

export class PruneBall extends Ball {
    name = "Boule à la Prune";

    constructor(game: BingoidGame) {
        super(game, "bmauve", "🟣");
    }

    take(context: RollContext): void {
        for (let i = 0; i < Math.min(this.game.history.length, 5); i++) {
            if (this.game.history[i]?.roll === context.roll) {
                this.game.summary.push(`${this.emoji} ${this.game.history[i]!.player} a tiré le même numéro précédemment!`);
                context.player.scorePoints(2);
                return;
            }
        }
        this.game.summary.push(`${this.emoji} Personne dans les 5 derniers joueurs n'a tiré le même numéro`);
    }
}

export class UspideDownCup extends Ball {
    name = "Boule Cachée";

    constructor(game: BingoidGame) {
        super(game, "essat", "❔");
    }

    take(context: RollContext): void {
        const ball = this.game.getRandomBall();
        this.game.summary.push(`${this.emoji} ${context.player} dévoile une **${ball}**!`);
        ball.take(context);
    }
}

export class PlayDohBall extends Ball {
    name = "Boule de Pâte à Modeler";

    constructor(game: BingoidGame) {
        super(game, "bvert", "🟢");
    }

    effects: Array<(context: RollContext) => void> = [
        // Si le numéro tiré a déjà été coché, le joueur vole ce numéro
        (context) => {
            const tile = this.game.getTileWithNumber(context.roll);
            if (tile?.marked) {
                this.game.summary.push(`${this.emoji} ${context.player} vole le **${context.roll}**!`);
                tile.marked = undefined;
            }
        },
        // Le joueur coche le numéro le plus petit qui n'a pas encore été coché
        (context) => {
            let minNumber = Infinity;
            let minTile;
            for (const tile of this.game.card.flat()) {
                if (!tile.marked && tile.number < minNumber) {
                    minNumber = tile.number;
                    minTile = tile;
                }
            }
            if (minTile) {
                this.game.summary.push(`${this.emoji} ${context.player} coche le numéro le plus petit encore disponible, le **${minNumber}**!`);
                this.game.markTile(context, minNumber);
            }
        },
        // Si un bingo arrive à ce tirage, la grille reste en jeu jusqu'au prochain.
        (context) => {
            this.game.summary.push(`${this.emoji} La grille ne changera pas si un bingo est formé et si elle n'est pas pleine!`);
            context.cardStaysOnBingo = true;
        },
        // Si le numéro tiré a déjà été coché, aucun point n'est marqué
        (context) => {
            this.game.summary.push(`${this.emoji} Aucun point de marqué si le numéro est déjà coché!`);
            context.alreadyMarkedPoints = 0;
        },
        // Si le joueur a au moins deux sel, il les perd et marque deux points
        (context) => {
            context.postMark.push(() => {
                const saltConversion = 2;
                if (context.player.salt >= saltConversion) {
                    this.game.summary.push(`${this.emoji} ${context.player} convertit **${saltConversion} 🧂 en points**!`);
                    context.player.salt -= saltConversion;
                    context.player.scorePoints(saltConversion);
                } else {
                    this.game.summary.push(`${this.emoji} ${context.player} n'est pas assez 🧂 salé`);
                }
            });
        },
        // Si le numéro tiré ne coche rien, le joueur donne un point à celui qui a le plus de sel (égalité à déterminer)
        (context) => {
            const cantMark = this.game.cantMark(context.roll);
            context.postMark.push(() => {
                if (cantMark) {
                    this.game.summary.push(`${this.emoji} ${context.player} n'a rien coché et doit donner au plus salé!`);
                    let maxSalt = -1;
                    let maxSalty;
                    for (const player of shuffle(Object.values(this.game.players))) {
                        if (player.salt > maxSalt) {
                            maxSalt = player.salt;
                            maxSalty = player;
                        }
                    }
                    if (maxSalty) {
                        context.player.steal(maxSalty, -1);
                    }
                } else {
                    this.game.summary.push(`${this.emoji} ${context.player} a coché une case`);
                }
            });
        },
        // Si le numéro tiré n'est pas dans la grille, le joueur perd un point
        (context) => {
            if (!this.game.getTileWithNumber(context.roll)) {
                this.game.summary.push(`${this.emoji} Le numéro n'est pas sur la grille!`);
                context.player.scorePoints(-1);
            } else {
                this.game.summary.push(`${this.emoji} Le numéro est sur la grille`);
            }
        },
        // Les points hors bingo marqués grâce à ce tirage sont doublés
        (context) => {
            this.game.summary.push(`${this.emoji} Les points hors bingo sont **doublés**!`);
            context.newlyMarkedPoints *= 2;
            context.alreadyMarkedPoints *= 2;
            context.notOnCardPoints *= 2;
        },
        // Le joueur vole un point à la dernière personne ayant tiré le même numéro 
        (context) => {
            const other = this.game.lastRolledBy[context.roll];
            if (other) {
                this.game.summary.push(`${this.emoji} ${context.player} vole **1 point** au dernier joueur à avoir tiré un **${context.roll}**!`);
                context.player.steal(other, 1);
            } else {
                this.game.summary.push(`${this.emoji} Personne n'a précédemment tiré un **${context.roll}**`);
            }
        },
    ];

    take(context: RollContext): void {
        randomlyPick(this.effects)(context);
    }
}
