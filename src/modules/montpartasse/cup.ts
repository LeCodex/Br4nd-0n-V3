import { randomlyPick } from "utils";
import MontpartasseGame from "./game";
import MontpartassePlayer from "./player";
import { shuffle } from "lodash";

export type CupColor = "blue" | "orange" | "green" | "purple" | "special" | "all" | "none";

export default abstract class Cup {
    static cupName: string;
    static description: string = "";
    static color: CupColor;
    static canBeRolled: boolean = true;
    emoji: string;

    get name() { return (this.constructor as typeof Cup).cupName; }
    get description() { return (this.constructor as typeof Cup).description; }
    get color() { return (this.constructor as typeof Cup).color; }

    constructor(public game: MontpartasseGame, key: string, public player?: MontpartassePlayer) {
        this.emoji = game.module.emojis[key]!.toString();
    }

    whenPlayed(index: number) { }
    whenPickedUp(index: number) { }
    whenOtherCupPlayed(other: Cup) { }

    toString() {
        return `**${this.emoji} ${this.name}**`;
    }

    serialize() {
        return {
            cls: this.constructor.name,
            player: this.player?.user.id
        }
    }
}

export class BlueCup extends Cup {
    static cupName = "Tasse Bleue";
    static readonly color = "blue";

    constructor(game: MontpartasseGame, player?: MontpartassePlayer) {
        super(game, "blue", player);
    }
}

export class OrangeCup extends Cup {
    static cupName = "Tasse Orange";
    static readonly color = "orange";
    
    constructor(game: MontpartasseGame, player?: MontpartassePlayer) {
        super(game, "orange", player);
    }
}

export class GreenCup extends Cup {
    static cupName = "Tasse Verte";
    static readonly color = "green";

    constructor(game: MontpartasseGame, player?: MontpartassePlayer) {
        super(game, "green", player);
    }
}

export class PurpleCup extends Cup {
    static cupName = "Tasse Violette";
    static readonly color = "purple";

    constructor(game: MontpartasseGame, player?: MontpartassePlayer) {
        super(game, "purple", player);
    }
}

export class RainbowCup extends Cup {
    static cupName = "Tasse Arc-en-Ciel";
    static description = "Est de toutes les couleurs";
    static readonly color = "all";

    constructor(game: MontpartasseGame, player?: MontpartassePlayer) {
        super(game, "rainbow", player);
    }
}

export class CottonCup extends Cup {
    static cupName = "Tasse de Coton";
    static description = "N'est d'aucune couleur";
    static readonly color = "none";
    static canBeRolled = false;

    constructor(game: MontpartasseGame, player?: MontpartassePlayer) {
        super(game, "cotton", player);
    }
}

export class CactusCup extends Cup {
    static cupName = "Tasse Cactus";
    static description = "Retire la couleur de la tasse juste en dessous";
    static readonly color = "special";

    constructor(game: MontpartasseGame, player?: MontpartassePlayer) {
        super(game, "cactus", player);
    }

    whenPlayed(index: number): void {
        const other = this.game.stack[index + 1];
        if (other) {
            this.game.summary.push(`${this.emoji} La ${other} est pleine de trous! On arrive plus à voir sa couleur!`);
            this.game.stack.splice(index + 1, 1, new CottonCup(this.game, other.player));
        } else {
            this.game.summary.push(`${this.emoji} Aucune tasse à percer pour la ${this.name}...`);
        }
    }
}

export class UpsideDownCup extends Cup {
    static cupName = "Tasse à l'Envers";
    static description = "Retourne la pile";
    static readonly color = "special";

    constructor(game: MontpartasseGame, player?: MontpartassePlayer) {
        super(game, "upsideDown", player);
    }

    whenPlayed(index: number): void {
        this.game.summary.push(`${this.emoji} La pile a été toute retournée!`);
        this.game.stack.reverse();
    }
}

export class PaintCup extends Cup {
    static cupName = "Tasse de Peinture";
    static description = "Transforme la tasse juste en dessous en une tasse de couleur aléatoire";
    static readonly color = "special";

    constructor(game: MontpartasseGame, player?: MontpartassePlayer) {
        super(game, "paint", player);
    }

    whenPlayed(index: number): void {
        const other = this.game.stack[index + 1];
        if (other) {
            const newCup = new (randomlyPick([BlueCup, OrangeCup, GreenCup, PurpleCup]))(this.game, other.player);
            this.game.summary.push(`${this.emoji} La ${other} a été repeinte en ${newCup}!`);
            this.game.stack.splice(index + 1, 1, newCup);
        } else {
            this.game.summary.push(`${this.emoji} Aucune tasse à peindre pour la ${this.name}...`);
        }
    }
}

export class RandomCup extends Cup {
    static cupName = "Aléatasse";
    static description = "Mélange la pile";
    static readonly color = "special";

    constructor(game: MontpartasseGame, player?: MontpartassePlayer) {
        super(game, "random", player);
    }

    whenPlayed(index: number): void {
        this.game.summary.push(`${this.emoji} La pile a été mélangée par le pouvoir du DE!`);
        this.game.stack = shuffle(this.game.stack);
    }
}

export class ThiefCup extends Cup {
    static cupName = "Tasse Vol";
    static description = "Prend le contrôle de la tasse juste en dessous";
    static readonly color = "special";

    constructor(game: MontpartasseGame, player?: MontpartassePlayer) {
        super(game, "thief", player);
    }

    whenPlayed(index: number): void {
        const other = this.game.stack[index + 1];
        if (other) {
            this.game.summary.push(`${this.emoji} La ${this.name} a pris le contrôle de la ${other}${other.player ? ` de ${other.player}` : ""}!`);
            other.player = this.player;
        } else {
            this.game.summary.push(`${this.emoji} Aucune tasse à voter pour la ${this.name}...`);
        }
    }
}

export class CarCup extends Cup {
    static cupName = "Tasse Radiocommandée";
    static description = "Défaussez votre main pour en repiocher une nouvelle";
    static readonly color = "special";

    constructor(game: MontpartasseGame, player?: MontpartassePlayer) {
        super(game, "car", player);
    }

    whenPlayed(index: number): void {
        if (this.player) {
            this.game.summary.push(`${this.emoji} ${this.player} a échangé toutes les tasses de sa main!`);
            this.player.hand = this.player.hand.map((_) => this.game.getRandomCup());
        } else {
            this.game.summary.push(`${this.emoji} La ${this.name} n'appartient à personne...`);
        }
    }
}

export class IridiumCup extends Cup {
    static cupName = "Tasse en Iridium";
    static description = "Devient une copie d'une autre tasse au hasard de la pile";
    static readonly color = "special";

    constructor(game: MontpartasseGame, player?: MontpartassePlayer) {
        super(game, "iridium", player);
    }

    whenPlayed(index: number): void {
        if (this.game.stack.length === 1) {
            this.game.summary.push(`${this.emoji} La ${this.name} n'a aucune tasse à copier...`);
            return;
        }

        let other;
        do {
            other = randomlyPick(this.game.stack);
        } while (other === this);
        const newCup = new (other.constructor as typeof BlueCup)(this.game, this.player);
        this.game.summary.push(`${this.emoji} La ${this.name} est devenue une ${newCup.name}!`);
        this.game.stack.splice(index, 1, newCup);
        newCup.whenPlayed(index);
    }
}
