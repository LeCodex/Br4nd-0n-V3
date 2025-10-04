import { random } from "lodash";
import { randomlyPick } from "../../utils";
import BossleGame, { BossleEventHandler, BossleEvents, ConcreteItems, WordleResult } from "./game";
import BosslePlayer from "./player";

export default abstract class ShopItem {
    abstract name: string;
    abstract emoji: string;
    abstract description: string;
    abstract cost: number;
    uses = 0;
    listeners = new Set<[keyof BossleEvents, BossleEventHandler]>();
    owner?: BosslePlayer;

    constructor(public game: BossleGame) { }

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
        return `${this.emoji}${' ' + '\\|'.repeat(this.uses)}`;
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
    name = "Potion de soin";
    emoji = "💖";
    description = "Restaure 10% de vos PV max";
    cost = 6;

    buy(player: BosslePlayer): boolean {
        const amount = Math.floor(this.game.maxHealth / 10);
        this.game.channel?.send(`### 💖 Vous avez regagné ${amount} PV!`);
        this.game.gainHealth(amount);
        return true;
    }
}

export class XpPotion extends ShopItem {
    name = "Potion d'expérience";
    emoji = "🎉";
    description = "Donne 10 points d'expérience";
    cost = 6;

    buy(player: BosslePlayer): boolean {
        this.game.channel?.send(`### 🎉 Vous avez gagné 10 XP!`);
        this.game.gainXP(10);
        return true;
    }
}

export class FirePotion extends ShopItem {
    name = "Potion de feu";
    emoji = "🔥";
    description = "Fais 3 dégâts au monstre";
    cost = 6;

    buy(player: BosslePlayer): boolean {
        this.game.channel?.send(`### 🔥 Le monstre a pris 3 dégâts!`);
        player.damageMonster(3);
        return true;
    }
}

export class MagnifyingGlass extends ShopItem {
    name = "Loupe";
    emoji = "🔎";
    description = "Révèle une lettre du mot du monstre";
    cost = 8;

    buy(player: BosslePlayer): boolean {
        this.game.channel?.send(`### 🔎 Le mot contient un \`${randomlyPick(this.game.targetWord)}\`!`);
        return true;
    }
}

export class CriticalPotion extends ShopItem {
    name = "Potion de criticité";
    emoji = "💥";
    description = "Double les dégâts au monstre ce tour-ci";
    cost = 10;

    buy(player: BosslePlayer): boolean {
        this.game.channel?.send(`### 💥 Les dégâts sont doublés ce tour-ci!`);
        this.game.untilEndOfTurn("monsterDamage", (context) => {
            context.amount *= 2;
        })
        return true;
    }
}

export class NeutralizingPotion extends ShopItem {
    name = "Potion neutralisante";
    emoji = "🧬";
    description = "Annule 1 des effets du monstre";
    cost = 14;

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
    name = "Médikit";
    emoji = "🩹";
    description = "Lorsque vous tuez un monstre, restaure 25% de votre vie max";
    cost = 8;
    uses = 3;

    constructor(game: BossleGame) {
        super(game);
    }

    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("defeated", (context) => {
            if (this.use()) {
                context.regenRatio += 1 / 4;
            }
        });
        return true;
    }
}

export class Shield extends ShopItem {
    name = "Bouclier";
    emoji = "🛡️";
    description = "Ignorez les `⬛` de votre premier mot";
    cost = 6;
    uses = 4;

    constructor(game: BossleGame) {
        super(game);
    }

    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("result", (context) => {
            if (context.player === this.owner && context.player.attempts.length === 1 && this.use()) {
                context.result = context.result.filter((e) => e !== WordleResult.INCORRECT);
            }
        });
        return true;
    }
}

export class MoneyBag extends ShopItem {
    name = "Sac";
    emoji = "💰";
    description = "Gagnez 1 Or supplémentaire par `🟡`";
    cost = 6;
    uses = 5;

    constructor(game: BossleGame) {
        super(game);
    }

    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("result", (context) => {
            if (context.player === this.owner && context.result.some((e) => e === WordleResult.WRONG_PLACE) && this.use()) {
                context.goldPerMisplaced++;
            }
        });
        return true;
    }
}

export class Vial extends ShopItem {
    name = "Fiole";
    emoji = "🧪";
    description = "Gagnez 1 XP supplémentaire par `🟩`";
    cost = 6;
    uses = 5;

    constructor(game: BossleGame) {
        super(game);
    }

    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("result", (context) => {
            if (context.player === this.owner && context.result.some((e) => e === WordleResult.CORRECT) && this.use()) {
                context.xpPerCorrect++;
            }
        });
        return true;
    }
}

export class Unction extends ShopItem {
    name = "Onction";
    emoji = "🪔";
    description = "Restaure 1 PV à chaque `🟩`";
    cost = 6;
    uses = 15;

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
    name = "Epée";
    emoji = "⚔️";
    description = "Augmente de 1 vos dégâts au monstre";
    cost = 6;
    uses = 3;

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
    name = "Arc";
    emoji = "🏹";
    description = "Si vous terminez avec 3 essais ou moins, doublez vos dégâts";
    cost = 6;
    uses = 2;

    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("monsterDamage", (context) => {
            if (context.player === this.owner && this.owner!.attempts.length <= 3 && this.use()) {
                context.amount *= 2;
            }
        });
        return true;
    }
}

export class Scarf extends ShopItem {
    name = "Echarpe";
    emoji = "🧣";
    description = "Ignorez les mots avec uniquement des `⬛`";
    cost = 6;
    uses = 3;

    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("result", (context) => {
            if (context.player === this.owner && context.result.every((e) => e === WordleResult.INCORRECT) && this.use()) {
                context.result = [];
            }
        });
        return true;
    }
}

export class MagicWand extends ShopItem {
    name = "Baguette magique";
    emoji = "🪄"; // :magic_wand:
    description = "Fait 1 dégât au monstre si vous trouvez un mot avec 3 ou 4 `🟩`";
    cost = 8;
    uses = 5;

    buy(player: BosslePlayer): boolean {
        if (!this.giveTo(player)) return false;
        this.on("result", (context) => {
            const corrects = context.result.filter((e) => e === WordleResult.CORRECT).length;
            if (context.player === this.owner && (corrects === 3 || corrects === 4) && this.use()) {
                player.damageMonster(1);
            }
        });
        return true;
    }
}

export class CrystalBall extends ShopItem {
    name = "Boule de cristal";
    emoji = "🔮";
    description = "Révèle une lettre `⬛` après chaque essai";
    cost = 8;
    uses = 10;

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
