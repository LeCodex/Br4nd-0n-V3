import BossleGame, { BossleEvents, BossleEventHandler, WordleResult } from "./game";

interface EffectData {
    name: string;
    emoji: string;
    description: string;
    disablable?: boolean;
}
const buildEffectDataAttributes = <K extends string>(attributes: Record<K, EffectData>) => attributes;
export const effectAttributesRepository = buildEffectDataAttributes({
    stingy: {
        name: "Radin",
        emoji: "🤐",
        description: "Divise par deux l'Or gagné (arrondi à l'inférieur)",
    },
    sick: {
        name: "Malade",
        emoji: "🤒",
        description: "Un mot trouvé ne rapporte pas les 5 XP qu'il devrait",
    },
    ferocious: {
        name: "Féroce",
        emoji: "😡",
        description: "Chaque `⬛` au delà de la moitié de la longueur du mot fait perdre 1 PV supplémentaire",
    },
    greedy: {
        name: "Avare",
        emoji: "🤑",
        description: "Les `🟡` font perdre 1 PV en plus du gain d'Or",
    },
    furtive: {
        name: "Furtif",
        emoji: "😶‍🌫️",
        description: "Prend 1 dégât de moins à chaque attaque",
    },
    sophisticated: {
        name: "Sophistiqué",
        emoji: "🧐",
        description: "Les joueurs doivent utiliser les indices qu'ils ont reçus",
    },
    quick: {
        name: "Rapide",
        emoji: "🫨", // :shaking_head:
        description: "Les joueurs ont 1 essai de moins",
    },
    patient: {
        name: "Patient",
        emoji: "😴",
        description: "A la fin du tour, fait perdre 10 PV s'il est en vie",
    },
    unusual: {
        name: "Atypique",
        emoji: "😵",
        description: "Inverse les effets des `🟩` et des `⬛`",
    },
    cruel: {
        name: "Cruel",
        emoji: "😈",
        description: "Double la perte de PV des `⬛` à partir du 4e essai",
    },
    venomous: {
        name: "Venimeux",
        emoji: "🤢",
        description: "Fait perdre 1 PV à chaque essai",
    },
    blind: {
        name: "Aveugle",
        emoji: "😎",
        description: "Seules les lettres de la première moitié du mot ont leurs effets",
    }
});
type EffectKey = keyof typeof effectAttributesRepository;

export default abstract class BossEffect {
    name: string;
    emoji: string;
    description: string;
    disablable: boolean;
    listeners = new Set<[keyof BossleEvents, BossleEventHandler]>();

    constructor(public game: BossleGame) {
        const key = this.constructor.name.slice(0, 1).toLowerCase() + this.constructor.name.slice(1) as EffectKey;
        const data = effectAttributesRepository[key];
        this.name = data.name,
        this.emoji = data.emoji,
        this.description = data.description,
        this.disablable = data.disablable ?? true;
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
    setupListeners(): void {
        this.on("finished", () => {
            this.game.gainXP(-5);
        });
    }
}

export class Ferocious extends BossEffect {
    setupListeners(): void {
        this.on("result", (context) => {
            const cutoff = this.game.targetWord.length / 2;
            let found = 0;
            for (const tile of context.result) {
                if (tile === WordleResult.INCORRECT) {
                    found++;
                    if (found > cutoff) {
                        context.totalDmg++;
                    }
                }
            }
        })
    }
}

export class Greedy extends BossEffect {
    setupListeners(): void {
        this.on("result", (context) => {
            context.result.forEach((e) => {
                if (e === WordleResult.WRONG_PLACE) {
                    context.totalDmg++;
                }
            });
        })
    }
}

export class Furtive extends BossEffect {
    setupListeners(): void {
        this.on("monsterDamage", (context) => {
            context.amount--;
        })
    }
}

export class Sophisticated extends BossEffect {
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

export class Fast extends BossEffect {
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
    setupListeners(): void {
        this.on("turnEnd", (context) => {
            this.game.gainHealth(-10);
        })
    }
}

export class Unusual extends BossEffect {
    setupListeners(): void {
        this.on("result", (context) => {
            const difference = context.result.filter((e) => e === WordleResult.CORRECT).length - context.result.filter((e) => e === WordleResult.INCORRECT).length;
            context.totalDmg += difference;
            context.totalXp -= difference;
        });
    }
}

export class Cruel extends BossEffect {
    setupListeners(): void {
        this.on("result", (context) => {
            if (context.player.attempts.length >= 4) {
                context.totalDmg *= 2;
            }
        });
    }
}

export class Venomous extends BossEffect {
    setupListeners(): void {
        this.on("result", (context) => {
            context.totalDmg += 1;
        });
    }
}

export class Blind extends BossEffect {
    setupListeners(): void {
        this.on("editResult", (context) => {
            context.result.splice(Math.ceil(context.result.length / 2), context.result.length);
        });
    }
}
