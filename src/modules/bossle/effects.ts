import BossleGame, { BossleEvents, BossleEventHandler, WordleResult } from "./game";

export default abstract class BossEffect {
    abstract name: string;
    abstract emoji: string;
    abstract description: string;
    listeners = new Set<[keyof BossleEvents, BossleEventHandler]>();

    constructor(public game: BossleGame) {
        this.setupListeners();
    }

    setupListeners() { }

    on<K extends keyof BossleEvents>(key: K, listener: BossleEventHandler<K>) {
        this.game.on(key, listener);
        this.listeners.add([key, listener as BossleEventHandler]);
    }

    destroy() {
        for (const [key, listener] of this.listeners) {
            this.game.off(key, listener);
        }
    }

    toString() {
        return `${this.emoji} **${this.name}**: ${this.description}`;
    }
}

export class Stingy extends BossEffect {
    name = "Radin";
    emoji = "🤐";
    description = "Divise par deux l'Or gagné (arrondi à l'inférieur)";
    preventGold = false;

    setupListeners(): void {
        this.on("gainGold", (context) => {
            this.preventGold = !this.preventGold;
            if (this.preventGold) {
                context.amount = 0;
            }
        });
    }
}

export class Sick extends BossEffect {
    name = "Malade";
    emoji = "🤒";
    description = "Un mot trouvé ne rapporte pas les 5 XP qu'il devrait";

    setupListeners(): void {
        this.on("finished", (context) => {
            context.xpGained = 0;
        });
    }
}

export class Ferocious extends BossEffect {
    name = "Féroce";
    emoji = "😡";
    description = "Chaque essai avec 4 ou 5 `⬛` fait perdre le double de PV";

    setupListeners(): void {
        this.on("result", (context) => {
            if (context.result.filter((e) => e === WordleResult.INCORRECT).length >= 4) {
                context.dmgPerIncorrect *= 2;
            }
        })
    }
}

export class Greedy extends BossEffect {
    name = "Avare";
    emoji = "🤑";
    description = "Les `🟨` font perdre un PV en plus du gain d'Or";

    setupListeners(): void {
        this.on("result", (context) => {
            context.result.forEach((e) => {
                if (e === WordleResult.WRONG_PLACE) {
                    this.game.gainHealth(-1);
                }
            });
        })
    }
}

export class Furtive extends BossEffect {
    name = "Furtif";
    emoji = "😶‍🌫️";
    description = "Prend la moitié des dégâts (arrondi au supérieur)";
    preventedDamage = true;

    setupListeners(): void {
        this.on("monsterDamage", (context) => {
            let realAmount = 0;
            for (let i = 0; i < context.amount; i++) {
                this.preventedDamage = !this.preventedDamage;
                if (!this.preventedDamage) {
                    realAmount++;
                }
            }
            context.amount = realAmount;
        })
    }
}
