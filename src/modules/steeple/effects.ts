import SteepleGame from "./game";
import SteeplePlayer from "./player";

export default abstract class Effect<T extends Record<string, unknown> | void = void> {
    used = false;
    abstract name: string;

    constructor(public game: SteepleGame, public player: SteeplePlayer, public data: T) { }

    tryToMove(index: number) {
        return true;
    }

    preMove(index: number, amount: number) {
        return amount;
    }

    onMove(index: number, amount: number) {
        return;
    }

    postMove(index: number) {
        return true;
    }

    turnEnd(index: number) {
        return;
    }

    throwEnd(player: SteeplePlayer) {
        return;
    }

    serialize() {
        return {
            cls: this.constructor.name,
            data: this.data
        };
    }
}

export class Comfortable extends Effect {
    name = "💤 Confortable 💤";

    tryToMove(index: number) {
        this.game.summary.push(`💤 ️Le canapé est trop confortable pour que ${this.player.toString()} en parte...`);
        this.used = true;
        return false;
    }
}

export class Prepared extends Effect {
    name = "⏩ Préparé ⏩";

    preMove(index: number, amount: number) {
        this.game.summary.push(`⏩ ️Zoom! ${this.player.toString()} est allé deux fois plus loin grâce au caddie!`);
        this.used = true;
        return 2 * amount;
    }
}

export class UnderPressure extends Effect<{ armed: boolean, index: number }> {
    name = "🧨 Sous Pression 🧨";

    turnEnd(index: number) {
        if (this.data.armed) {
            this.used = true;
            if (index === this.data.index) {
                this.game.summary.push(`💥 BOUM! ${this.player.toString()} est resté trop longtemps au même endroit!`);
                const amount = Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 2;
                this.player.move(-amount);
            } else {
                this.game.summary.push(`🧨 ${this.player.toString()} a bougé à temps`);
            }
        }
    }

    throwEnd(player: SteeplePlayer) {
        this.data.armed = true;
    }
}

export class Clean extends Effect {
    name = "🧼 Propre 🧼";

    postMove(index: number) {
        if (this.game.board[index].effect) {
            this.game.summary.push(`🧼 ${this.player.toString()} n'active pas l'effet grâce à sa douche`);
            this.used = true;
            return false;
        }
        return true;
    }
}
