import BossleGame, { BossleEvents, BossleEventHandler, WordleResult } from "./game";

export default abstract class BossEffect {
    abstract name: string;
    abstract emoji: string;
    abstract description: string;
    listeners = new Set<[keyof BossleEvents, BossleEventHandler]>();
    disablable = true;

    constructor(public game: BossleGame) {
        this.setupListeners();
    }

    setupListeners() { }

    on<K extends keyof BossleEvents>(key: K, listener: BossleEventHandler<K>) {
        const wrappedListener: BossleEventHandler<K> = (context) => {
            if (!this.game.isMonsterAlive) return;
            return listener(context);
        }
        this.game.on(key, wrappedListener);
        this.listeners.add([key, wrappedListener as BossleEventHandler]);
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
        this.on("finished", () => {
            this.game.gainXP(-5);
        });
    }
}

export class Ferocious extends BossEffect {
    name = "Féroce";
    emoji = "😡";
    description = "Chaque essai avec 4 `⬛` ou plus fait perdre le double de PV";

    setupListeners(): void {
        this.on("result", (context) => {
            if (context.constResult.filter((e) => e === WordleResult.INCORRECT).length >= 4) {
                context.dmgPerIncorrect *= 2;
            }
        })
    }
}

export class Greedy extends BossEffect {
    name = "Avare";
    emoji = "🤑";
    description = "Les `🟡` font perdre 1 PV en plus du gain d'Or";

    setupListeners(): void {
        this.on("result", (context) => {
            context.constResult.forEach((e) => {
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
    description = "Prend 1 dégât de moins à chaque attaque";

    setupListeners(): void {
        this.on("monsterDamage", (context) => {
            context.amount--;
        })
    }
}

export class Sophisticated extends BossEffect {
    name = "Sophistiqué";
    emoji = "🧐";
    description = "Les joueurs doivent utiliser les indices qu'ils ont reçus";

    setupListeners(): void {
        this.on("attempt", (context) => {
            const wrongPlaceClues = new Set<string>();
            const correctClues = new Map<number, string>();
            for (const attempt of context.player.attempts) {
                for (const [i, result] of this.game.attemptToResult(attempt).entries()) {
                    const letter = attempt[i]!;
                    if (result === WordleResult.WRONG_PLACE) {
                        wrongPlaceClues.add(letter);
                    } else if (result === WordleResult.CORRECT) {
                        correctClues.set(i, letter);
                    }
                }
            }

            for (const letter of wrongPlaceClues) {
                if (!context.attempt.includes(letter)) {
                    context.valid = false;
                    return;
                }
            }

            for (const [position, letter] of correctClues.entries()) {
                if (context.attempt[position] !== letter) {
                    context.valid = false;
                    return;
                }
            }
        });
    }
}

export class Tough extends BossEffect {
    name = "Coriace";
    emoji = "🤖";
    description = "Le mot a 1 lettre supplémentaire";
    disablable = false;  // Can't change the word mid turn

    setupListeners(): void {
        this.on("newWord", (context) => {
            context.length++;
        })
    }
}

export class Fast extends BossEffect {
    name = "Rapide";
    emoji = "🫨"; // :shaking_head:
    description = "Les joueurs ont 1 essai de moins";

    destroy(): void {
        super.destroy();
        for (const player of Object.values(this.game.players)) {
            player.maxAttempts++;
        }
    }

    setupListeners(): void {
        this.on("turnStart", (context) => {
            for (const player of Object.values(this.game.players)) {
                player.maxAttempts--;
            }
        })
    }
}

export class Patient extends BossEffect {
    name = "Patient";
    emoji = "😴";
    description = "A la fin du tour, fais 10 dégâts s'il est en vie";

    setupListeners(): void {
        this.on("turnEnd", (context) => {
            this.game.gainHealth(-10);
        })
    }
}

export class Unusual extends BossEffect {
    name = "Atypique";
    emoji = "😵";
    description = "Inverse les effets des `🟩` et des `⬛`";

    setupListeners(): void {
        this.on("result", (context) => {
            context.result = context.result.map((e) => e === WordleResult.CORRECT ? WordleResult.INCORRECT : e === WordleResult.INCORRECT ? WordleResult.CORRECT : e)
        });
    }
}
