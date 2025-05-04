import CoupdjusGame from "./game";
import CoupdjusPlayer from "./player";

export default class Fruit {
    static data: Record<string, [string, string]> = {
        banana: ["🍌", "Banane"],
        cherries: ["🍒", "Cerises"],
        orange: ["🍊", "Orange"],
        grapes: ["🍇", "Raisin"],
        kiwi: ["🥝", "Kiwi"]
    };
    emoji: string;
    name: string;

    constructor(public player: CoupdjusPlayer, public id: string) {
        [this.emoji, this.name] = Fruit.data[id] ?? ["🥚", "Oeuf"];
    }

    get fullName() {
        return `${this.emoji.toString()} ${this.name}`;
    }

    async effect(effect_return = "", persistent = false) {
        return this.player.game.nextTurn(this.player, `${this.fullName} de ${this.player.user.displayName}`);
    }

    serialize() {
        return {
            player: this.player.user.id,
            id: this.id
        }
    }

    static load(player: CoupdjusPlayer, obj: ReturnType<Fruit["serialize"]>) {
        return new this(player, obj.id);
    }
}
