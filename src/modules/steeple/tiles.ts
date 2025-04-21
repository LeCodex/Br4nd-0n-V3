import { getEmoji } from "utils";
import SteepleGame from "./game";
import { Emoji } from "discord.js";
import SteeplePlayer from "./player";
import { Clean, Comfortable, Prepared, UnderPressure } from "./effects";

export default abstract class Tile {
    emoji: string | Emoji;
    abstract name: string;
    abstract description: string;

    constructor(public game: SteepleGame, id: string, fallback: string) {
        this.emoji = fallback;
        getEmoji(id, fallback).then(e => { this.emoji = e; });
    }

    get fullName() {
        return `${this.emoji.toString()} ${this.name}`;
    }

    tryToMove(player: SteeplePlayer, index: number) {
        return true;
    }

    effect?(player: SteeplePlayer, index: number, amount: number): void;
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
        this.game.summary.push(`🌵 ${player.toString()} a refusé d'aller s'asseoir sur un cactus et est revenu en arrière.`);
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
        this.game.summary.push(`🛋️ ${player.toString()} est arrivé sur un canapé, et va vouloir y rester..️.`);
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
        this.game.summary.push(`🛒 ${player.toString()} s'est installé dans le caddie`);
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
        const target = Object.values(this.game.players).reduce((acc, element) => {
            let dist = Math.abs(element.index - player.index);
            if (dist < acc.minDist && element != player) {
                acc.minDist = dist;
                acc.target = element;
            }
            return acc;
        }, { minDist: Infinity, target: undefined as SteeplePlayer | undefined }).target;

        if (target) {
            this.game.summary.push(`🎠${player.toString()} a pris le carrousel pour inverser de place avec " + target.toString() + "!`);
            [target.index, player.index] = [player.index, target.index];
        } else {
            this.game.summary.push(`🎠 ${player.toString()} n'avait personne avec qui échanger de place...`);
        }
    }
}

export class BusStop extends Tile {
    name = "Arrêt de bus";
    description = "Te téléporte à un autre 🚏 aléatoire";

    constructor(game: SteepleGame) {
        super(game, "0", "🚏");
    }

    effect(player: SteeplePlayer, index: number, amount: number) {
        let stops = this.game.board.filter((e, i) => e.constructor.name === this.constructor.name && i != index);

        if (stops.length) {
            let stop = stops[Math.floor(Math.random() * stops.length)];
            let stopIndex = this.game.board.indexOf(stop);
            let distance = stopIndex - player.index;

            this.game.summary.push(`🚏 ${player.toString()} a pris le bus sur ${Math.abs(distance)} ${Math.abs(distance) > 1 ? "cases" : "case"} en ${distance > 0 ? "avant" : "arrière"}`);

            player.index = stopIndex;
        } else {
            this.game.summary.push(`🚏 ${player.toString()} a attendu longtemps à l'arrêt de bus...`);
        }
    }
}

export class Box extends Tile {
    name = "Boîte en carton";
    description = "Si plus de 3 joueurs sont dessus, ils doivent tous reculer de 2d6 cases";

    constructor(game: SteepleGame) {
        super(game, "0", "📦");
    }

    effect(player: SteeplePlayer, index: number, amount: number) {
        let playersOn = Object.values(this.game.players).filter(e => e.index === index);

        if (playersOn.length > 1) {
            this.game.summary.push(`💫 La boîte en carton a cassé!`);

            playersOn.forEach((player) => {
                const rndAmount = -Math.floor(Math.random() * 11 + 2);
                player.move(rndAmount);
            });
        } else {
            this.game.summary.push(`📦 La boîte craque mais ne cède pas...`);
        }
    }
}

export class Dynamite extends Tile {
    name = "Dynamite";
    description = "Si tu restes dessus pendant un tour complet, elle explose et tu recules de 2d6 cases";

    constructor(game: SteepleGame) {
        super(game, "0", "🧨");
    }

    effect(player: SteeplePlayer, index: number, amount: number) {
        player.addEffect(new UnderPressure(this.game, player, { index: index, armed: false }));
    }
}

export class Bathtub extends Tile {
    name = "Baignoire";
    description = "Empêche le prochain effet de s'activer";

    constructor(game: SteepleGame) {
        super(game, "0", "🛁");
    }

    effect(player: SteeplePlayer, index: number, amount: number) {
        player.addEffect(new Clean(this.game, player));
    }
}
