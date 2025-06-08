import { getEmoji } from "utils";
import BingoidGame from "./game";
import { Emoji } from "discord.js";
import BingoidPlayer from "./player";

export default abstract class Ball {
    emoji: string | Emoji;
    abstract name: string;

    constructor(public game: BingoidGame, id: string, fallback: string) {
        this.emoji = fallback;
        getEmoji(id, fallback).then(e => { this.emoji = e; });
    }

    abstract take(player: BingoidPlayer, roll: number): void;

    toString() {
        return `${this.emoji} ${this.name}`;
    }
}

export class ClassicBall extends Ball {
    name = "Boule Classique";

    constructor(game: BingoidGame) {
        super(game, "1036958716253179904", "🟡");
    }

    take(player: BingoidPlayer, roll: number) {}
}

export class RussianBall extends Ball {
    name = "Boule Russe";

    constructor(game: BingoidGame) {
        super(game, "1036958955248828446", "🔴");
    }

    take(player: BingoidPlayer, roll: number): void {
        player.scorePoints(Math.floor(Math.random() * 3) - 1);
    }
}

export class ErasableBall extends Ball {
    name = "Boule Effaçable";

    constructor(game: BingoidGame) {
        super(game, "1036959019958538250", "⚪");
    }
}

export class FacetedBall extends Ball {
    name = "Boule à Facettes";

    constructor(game: BingoidGame) {
        super(game, "1036958798218268682", "🟠");
    }
}

export class PetanqueBall extends Ball {
    name = "Boule de Pétanque";

    constructor(game: BingoidGame) {
        super(game, "1036958873082417232", "⚫");
    }

    take(player: BingoidPlayer, roll: number): void {
        if (!this.game.isOnCard(roll)) {
            player.steal(this.game.history[0], 1);
        }
    }
}

export class PruneBall extends Ball {
    name = "Boule à Prunes";

    constructor(game: BingoidGame) {
        super(game, "1036959089219084300", "🟣");
    }
}

export class UspideDownCup extends Ball {
    name = "Boule Cachée";
    ball: Ball

    constructor(game: BingoidGame) {
        super(game, "1036960562275438642", "❔");
        this.ball = new ClassicBall(game);
    }

    take(player: BingoidPlayer, roll: number): void {
        this.game.summary.unshift(`${this.emoji} ${player} dévoile une ${this.ball}!`);
        this.ball.take(player, roll);
    }
}

export class PlayDohBall extends Ball {
    name = "Boule de Pâte à Modeler";

    constructor(game: BingoidGame) {
        super(game, "1036959163353411634", "🟢");
    }
}