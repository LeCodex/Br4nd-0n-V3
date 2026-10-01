import { getEmoji }from "src/utils";
import SteepleGame from "./game";
import { Emoji } from "discord.js";
import SteeplePlayer from "./player";
import { Clean, Comfortable, Prepared, UnderPressure } from "./effects";
import { shuffle } from "lodash";

export default abstract class Tile<T extends Record<string, any> | void = void> {
    emoji: string | Emoji;
    abstract name: string;
    abstract description: string;

    constructor(public game: SteepleGame, id: string, fallback: string, public data: T) {
        this.emoji = fallback;
        getEmoji(id, fallback).then(e => { this.emoji = e; });
    }

    get fullName() {
        return `${this.emoji.toString()} ${this.name}`;
    }

    get icon() {
        return this.emoji;
    }

    tryToMove(player: SteeplePlayer, index: number) {
        return true;
    }

    effect?(player: SteeplePlayer, index: number, amount: number): void;

    serialize() {
        return {
            cls: this.constructor.name,
            data: this.data
        };
    }
}

export class Chair extends Tile {
    name = "Chaise";
    description = "Aucun effet";

    constructor(game: SteepleGame) {
        super(game, "0", "🪑");
    }
}

export class Cactus extends Tile {
    name = "Cactus";
    description = "Empêche le mouvement sur cette case";

    constructor(game: SteepleGame) {
        super(game, "0", "🌵");
    }

    effect(player: SteeplePlayer, index: number, amount: number) {
        this.game.summary.push(`${this.emoji} ${player.toString()} a refusé d'aller s'asseoir sur un cactus et est revenu en arrière.`);
        player.index -= amount;
    }
}

export class Fountain extends Tile {
    name = "Fontaine";
    description = "Te fais reculer de 1d6 cases";

    constructor(game: SteepleGame) {
        super(game, "0", "⛲");
    }

    effect(player: SteeplePlayer, index: number, amount: number) {
        this.game.summary.push(`💦 ️Splash! ${player.toString()} est tombé dans la fontaine!`);
        const rndAmount = -Math.floor(Math.random() * 6 + 1);
        player.move(rndAmount);
    }
}

export class Couch extends Tile {
    name = "Canapé";
    description = "Annule ton prochain mouvement";

    constructor(game: SteepleGame) {
        super(game, "0", "🛋️");
    }

    effect(player: SteeplePlayer, index: number, amount: number) {
        this.game.summary.push(`${this.emoji} ${player.toString()} est arrivé sur un canapé, et va vouloir y rester..️.`);
        player.addEffect(new Comfortable(this.game, player));
    }
}

export class Cart extends Tile {
    name = "Caddie";
    description = "Double ton prochain mouvement";

    constructor(game: SteepleGame) {
        super(game, "0", "🛒");
    }

    effect(player: SteeplePlayer, index: number, amount: number) {
        this.game.summary.push(`${this.emoji} ${player.toString()} s'est installé dans le caddie`);
        player.addEffect(new Prepared(this.game, player));
    }
}

export class Carousel extends Tile {
    name = "Carrousel";
    description = "Echange de place avec le joueur le plus proche";

    constructor(game: SteepleGame) {
        super(game, "0", "🎠");
    }

    effect(player: SteeplePlayer, index: number, amount: number) {
        const target = shuffle(Object.values(this.game.players)).reduce((acc, element) => {
            let dist = Math.abs(element.index - player.index);
            if (dist < acc.minDist && element != player) {
                acc.minDist = dist;
                acc.target = element;
            }
            return acc;
        }, { minDist: Infinity, target: undefined as SteeplePlayer | undefined }).target;

        if (target) {
            const distance = Math.abs(player.index - target.index);
            this.game.summary.push(`${this.emoji} ${player.toString()} a pris le carrousel pour inverser de place avec ${target.toString()} à ${distance} case${distance > 1 ? "s" : ""} de distance!`);
            [target.index, player.index] = [player.index, target.index];
        } else {
            this.game.summary.push(`${this.emoji} ${player.toString()} n'avait personne avec qui échanger de place...`);
        }
    }
}

export class BusStop extends Tile {
    name = "Arrêt de bus";
    description = "Te téléporte au 🚏 suivant ou précédent";

    constructor(game: SteepleGame) {
        super(game, "0", "🚏");
    }

    effect(player: SteeplePlayer, index: number, amount: number) {
        let direction = Math.floor(Math.random() * 2) * 2 - 1;
        if (player.score == 0 && this.game.board.findIndex((tile) => tile instanceof BusStop) == index) {
            direction = 1;
        }
        let stopIndex = player.index;
        do {
            stopIndex = (stopIndex + direction) % this.game.board.length;
        } while (!(this.game.board[stopIndex] instanceof BusStop))
        let distance = Math.abs(player.index - stopIndex) * direction;

        this.game.summary.push(`${this.emoji} ${player.toString()} a pris le bus sur ${Math.abs(distance)} ${Math.abs(distance) > 1 ? "cases" : "case"} en ${distance > 0 ? "avant" : "arrière"}`);

        player.index += distance;
        player.checkForWrapping();
    }
}

export class Box extends Tile {
    name = "Boîte en carton";
    description = "Si plusieurs joueurs sont dessus, ils doivent tous reculer de 2d6 cases";

    constructor(game: SteepleGame) {
        super(game, "0", "📦");
    }

    effect(player: SteeplePlayer, index: number, amount: number) {
        let playersOn = Object.values(this.game.players).filter(e => e.index === index);

        if (playersOn.length > 1) {
            this.game.summary.push(`💫 La boîte en carton a cassé!`);

            playersOn.forEach((player) => {
                const rndAmount = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2;
                player.move(-rndAmount);
            });
        } else {
            this.game.summary.push(`${this.emoji} La boîte craque mais ne cède pas...`);
        }
    }
}

export class Dynamite extends Tile {
    name = "Dynamite";
    description = "Si tu ne quittes pas cette case avant la fin de ton prochain tour, elle explose et tu recules de 2d6 cases";

    constructor(game: SteepleGame) {
        super(game, "0", "🧨");
    }

    effect(player: SteeplePlayer, index: number, amount: number) {
        player.addEffect(new UnderPressure(this.game, player, { index: index, armed: false }));
    }
}

export class Bathtub extends Tile {
    name = "Baignoire";
    description = "Empêche le prochain effet sur lequel tu arrives de s'activer";

    constructor(game: SteepleGame) {
        super(game, "0", "🛁");
    }

    effect(player: SteeplePlayer, index: number, amount: number) {
        player.addEffect(new Clean(this.game, player));
    }
}

export class Sign extends Tile<{ player?: string }> {
    name = "Panneau";
    description = "Fait de nouveau avancer le joueur dont le nom est marqué, puis marque ton nom";

    constructor(game: SteepleGame, data: { player?: string } = {}) {
        super(game, "0", "🪧", data);
    }

    get icon() {
        return this.data.player ? this.game.players[this.data.player]!.emoji : this.emoji;
    }

    effect(player: SteeplePlayer, index: number, amount: number): void {
        if (this.data.player) {
            const other = this.game.players[this.data.player]!;
            this.game.summary.push(`${this.emoji} ${other.toString()} a avancé de nouveau!`)
            other.move(this.game.order.indexOf(this.data.player) + 1);
        }

        this.game.summary.push(`${this.emoji} ${player.toString()} a marqué son nom sur le panneau`)
        this.data.player = player.user.id;
    }
}
