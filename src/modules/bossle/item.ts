import { randomlyPick } from "../../utils";
import BossleGame, { BossleEventHandler, BossleEvents, ConcreteItems, WordleResult } from "./game";
import BosslePlayer from "./player";

interface ItemData {
    name: string;
    emoji: string;
    description: string;
    cost: number;
    uses?: number;
}
const buildItemAttributes = <K extends string>(attributes: Record<K, ItemData>) => attributes;
export const itemAttributesRepository = buildItemAttributes({
    healthPotion: {
        name: "Potion de soin",
        emoji: "💖",
        description: "Restaure 10% de vos PV max",
        cost: 6
    },
    xpPotion: {
        name: "Potion d'expérience",
        emoji: "🎉",
        description: "Donne 10% de l'XP pour le niveau suivant",
        cost: 6,
    },
    firePotion: {
        name: "Potion de feu",
        emoji: "🔥",
        description: "Fait 3 dégâts au monstre",
        cost: 6,
    },
    magnifyingGlass: {
        name: "Loupe",
        emoji: "🔎",
        description: "Révèle une lettre du mot du monstre",
        cost: 8,
    },
    criticalPotion: {
        name: "Potion de criticité",
        emoji: "💥",
        description: "Double les dégâts au monstre ce tour-ci",
        cost: 10,
    },
    neutralizingPotion: {
        name: "Potion neutralisante",
        emoji: "🧬",
        description: "Annule 1 des effets du monstre",
        cost: 14,
    },
    medkit: {
        name: "Médikit",
        emoji: "🩹",
        description: "Lorsque le monstre est vaincu, restaure 10% de votre vie max",
        cost: 8,
        uses: 3,
    },
    shield: {
        name: "Bouclier",
        emoji: "🛡️",
        description: "Ignorez la perte de PV de votre premier mot",
        cost: 6,
        uses: 4,
    },
    moneyBag: {
        name: "Sac",
        emoji: "💰",
        description: "Gagnez 1 Or supplémentaire par `🟡`",
        cost: 6,
        uses: 5,
    },
    vial: {
        name: "Fiole",
        emoji: "🧪",
        description: "Gagnez 1 XP supplémentaire par `🟩`",
        cost: 6,
        uses: 5,
    },
    unction: {
        name: "Onction",
        emoji: "🪔",
        description: "Restaure 1 PV à chaque `🟩`",
        cost: 6,
        uses: 15,
    },
    sword: {
        name: "Epée",
        emoji: "⚔️",
        description: "Augmente de 1 tous vos dégâts au monstre",
        cost: 6,
        uses: 5,
    },
    bow: {
        name: "Arc",
        emoji: "🏹",
        description: "Si vous terminez avec 3 essais ou moins, doublez vos dégâts",
        cost: 6,
        uses: 2,
    },
    scarf: {
        name: "Echarpe",
        emoji: "🧣",
        description: "Ignorez les mots avec 4 `⬛` ou plus",
        cost: 6,
        uses: 3,
    },
    magicWand: {
        name: "Baguette magique",
        emoji: "🪄", // :magic_wand:
        description: "Fait 1 dégât au monstre si vous trouvez un mot avec 3 ou 4 `🟩`",
        cost: 8,
        uses: 5,
    },
    crystalBall: {
        name: "Boule de cristal",
        emoji: "🔮",
        description: "Vous révèle une lettre `⬛` après chaque essai",
        cost: 8,
        uses: 10,
    },
    helmet: {
        name: "Casque",
        emoji: "🪖",
        description: "Ignorez la première lettre si elle est `⬛`",
        cost: 8,
        uses: 5
    },
    shoes: {
        name: "Chaussures",
        emoji: "👟",
        description: "Ignorez la dernière lettre si elle est `⬛`",
        cost: 8,
        uses: 5
    }
});
type ItemKey = keyof typeof itemAttributesRepository;

export default abstract class ShopItem implements ItemData {
    name: string;
    emoji: string;
    description: string;
    cost: number
    uses: number;
    listeners = new Set<[keyof BossleEvents, BossleEventHandler]>();
    owner?: BosslePlayer;

    constructor(public game: BossleGame) {
        const key = this.constructor.name.slice(0, 1).toLowerCase() + this.constructor.name.slice(1) as ItemKey;
        const data = itemAttributesRepository[key];
        this.name = data?.name ?? "Missing name!";
        this.emoji = data?.emoji ?? "⚠";
        this.description = data?.description ?? "Missing description!";
        this.cost = data?.cost ?? 9999;
        this.uses = data?.uses ?? 0;
    }

    abstract buy(player: BosslePlayer): boolean;

    giveTo(player: BosslePlayer) {
        if (player.items.size >= 3) {
            return false;
        }
        this.owner?.items.delete(this);
        this.owner = player;
        player.items.add(this);
        return true;
    }

    on<K extends keyof BossleEvents>(key: K, listener: BossleEventHandler<K>) {
        this.game.on(key, listener);
        this.listeners.add([key, listener as BossleEventHandler]);
    }

    use(): boolean {
        if (this.uses <= 0) return false;
        this.uses--;
        if (this.uses <= 0) this.destroy();
        return true;
    }

    destroy() {
        this.owner?.items.delete(this);
        for (const [key, listener] of this.listeners) {
            this.game.off(key, listener);
        }
    }

    toString() {
        return `${this.cost} :coin: - ${this.emoji} **${this.name}**: ${this.description}${this.uses > 0 ? ` (${this.uses} utilisations)` : ''}`;
    }

    toCondensed() {
        return `${this.emoji} x${this.uses}`;
    }

    serialize() {
        return {
            cls: this.constructor.name as keyof ConcreteItems,
            uses: this.uses
        }
    }
}

// =================== ONE-SHOT ITEMS ===================
export class HealthPotion extends ShopItem {
    buy(player: BosslePlayer): boolean {
        const amount = Math.floor(this.game.maxHealth / 10);
        this.game.channel?.send(`### 💖 Vous avez regagné ${amount} PV!`);
        this.game.gainHealth(amount);
        return true;
    }
}

export class XpPotion extends ShopItem {
    buy(player: BosslePlayer): boolean {
        const amount = Math.floor(this.game.xpForNextLevel / 10);
        this.game.channel?.send(`### 🎉 Vous avez gagné ${amount} XP!`);
        this.game.gainXP(amount);
        return true;
    }
}

export class FirePotion extends ShopItem {
    buy(player: BosslePlayer): boolean {
        this.game.channel?.send(`### 🔥 Le monstre a pris 3 dégâts!`);
        player.damageMonster(3);
        return true;
    }
}

export class MagnifyingGlass extends ShopItem {
    buy(player: BosslePlayer): boolean {
        this.game.channel?.send(`### 🔎 Le mot contient un \`${randomlyPick(this.game.targetWord)}\`!`);
        return true;
    }
}

export class CriticalPotion extends ShopItem {
    buy(player: BosslePlayer): boolean {
        this.game.channel?.send(`### 💥 Les dégâts sont doublés ce tour-ci!`);
        this.game.untilEndOfTurn("monsterDamage", (context) => {
            context.amount *= 2;
        })
        return true;
    }
}

export class NeutralizingPotion extends ShopItem {
    buy(player: BosslePlayer): boolean {
        const effect = randomlyPick(this.game.monsterEffects.filter((e) => e.disablable));
        if (!effect) {
            return false;
        }
        this.game.monsterEffects.splice(this.game.monsterEffects.indexOf(effect), 1);
        effect.destroy();
        this.game.channel?.send(`### 🧬 L'effet ${effect.name} a été neutralisé!`);
        return true;
    }
}

// =================== HELD ITEMS ===================
export class Medkit extends ShopItem {
    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("defeated", (context) => {
            if (this.use()) {
                context.regenRatio += 1 / 10;
            }
        });
        return true;
    }
}

export class Shield extends ShopItem {
    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("result", (context) => {
            if (context.player === this.owner && this.game.isMonsterAlive && context.player.attempts.length === 1 && this.use()) {
                context.totalDmg = 0;
            }
        });
        return true;
    }
}

export class MoneyBag extends ShopItem {
    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("result", (context) => {
            const wrongPlaces = context.result.filter((e) => e === WordleResult.WRONG_PLACE).length;
            if (context.player === this.owner && wrongPlaces && this.use()) {
                context.totalGold += wrongPlaces;
            }
        });
        return true;
    }
}

export class Vial extends ShopItem {
    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("result", (context) => {
            const corrects = context.result.filter((e) => e === WordleResult.CORRECT).length;
            if (context.player === this.owner && corrects > 0 && this.use()) {
                context.totalXp += corrects;
            }
        });
        return true;
    }
}

export class Unction extends ShopItem {
    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("result", (context) => {
            if (context.player === this.owner) {
                context.result.forEach((e) => {
                    if (e === WordleResult.CORRECT && this.use()) {
                        this.game.gainHealth(1);
                    }
                });
            }
        });
        return true;
    }
}

export class Sword extends ShopItem {
    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("monsterDamage", (context) => {
            if (context.player === this.owner && this.use()) {
                context.amount++;
            }
        });
        return true;
    }
}

export class Bow extends ShopItem {
    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("finished", (context) => {
            if (context.player === this.owner && this.game.isMonsterAlive && this.owner!.attempts.length <= 3 && this.use()) {
                context.damage *= 2;
            }
        });
        return true;
    }
}

export class Scarf extends ShopItem {
    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("result", (context) => {
            if (context.player === this.owner && this.game.isMonsterAlive && context.result.filter((e) => e === WordleResult.INCORRECT).length >= 4 && this.use()) {
                context.ignore = true;
            }
        });
        return true;
    }
}

export class MagicWand extends ShopItem {
    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("result", (context) => {
            const corrects = context.result.filter((e) => e === WordleResult.CORRECT).length;
            if (context.player === this.owner && this.game.isMonsterAlive && (corrects === 3 || corrects === 4) && this.use()) {
                player.damageMonster(1);
            }
        });
        return true;
    }
}

export class CrystalBall extends ShopItem {
    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("result", (context) => {
            if (context.player === this.owner && this.use()) {
                let letter: string;
                do {
                    letter = randomlyPick("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
                } while (this.game.targetWord.includes(letter) || this.owner.incorrectLetters.has(letter));
                this.owner.summary.push(`🔮 Le \`${letter}\` n'est pas dans le mot`);
                this.owner.incorrectLetters.add(letter);
            }
        });
        return true;
    }
}

export class Helmet extends ShopItem {
    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("editResult", (context) => {
            if (context.player === this.owner && context.result[0] === WordleResult.INCORRECT && this.use()) {
                context.result.shift();
            }
        });
        return true;
    }
}

export class Shoes extends ShopItem {
    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("editResult", (context) => {
            if (context.player === this.owner && context.result[context.attempt.length - 1] === WordleResult.INCORRECT && this.use()) {
                context.result.pop();
            }
        });
        return true;
    }
}
