import { range } from "lodash";
import BosslePlayer from "./player";
import { isConsonant } from "./utils";
import BossleGame, { ConcreteClasses, WordleResult } from "./game";
import { ListenerSource } from "./listener";
import { randomlyPick } from "../../utils";

interface PlayerClassData {
    name: string;
    emoji: string;
    descriptions: Array<string>;
    activeAbilityLevel: number;
    activeAbilityCost: number;
}
const buildPlayerClassDataAttributes = <K extends string>(attributes: Record<K, PlayerClassData>) => attributes;
export const playerClassAttributesRepository = buildPlayerClassDataAttributes({
    seer: {
        name: "Devin.e",
        emoji: "🔮",
        descriptions: [
            "Au début de chaque tour, révèle une lettre ⬛.",
            "6 🟩 : Révèle une autre lettre ⬛.",
            "Révèle initialement une consonne 🟩 à la place.",
            "Quand vous utilisez une lettre révélée, faites 1 dégât."
        ],
        activeAbilityLevel: 1,
        activeAbilityCost: 6
    },
    armorsmith: {
        name: "Armurier.ère",
        emoji: "🛡️",
        descriptions: [
            "Chaque lettre ⬛ unique ne vous fait perdre des PV qu'une seule fois par tour.",
            "Ignorez les ⬛ du premier mot.",
            "Si vous avez fait 6 ⬛ ou plus, +2 dégâts de mot.",
            "25 🟩 : Tou.tes les joueur.ses ignorent le premier ⬛ de chaque essai à leur prochaine attaque."
        ],
        activeAbilityLevel: 3,
        activeAbilityCost: 25
    },
    merchant: {
        name: "Marchand.e",
        emoji: "💰",
        descriptions: [
            "Les rafraîchissements coûtent 1 🟡 de moins. (Minimum 0)",
            "Vos 🟩 rapportent aussi 1 🟡.",
            "8 🟩 : Double les gains de 🟡 ce tour-ci (y compris rétroactif). Max 1 fois par tour.",
            "Chaque fois que des 🟡 sont dépensés, faites 1 dégât."
        ],
        activeAbilityLevel: 2,
        activeAbilityCost: 8
    },
    priest: {
        name: "Prêtre.sse",
        emoji: "✝️",
        descriptions: [
            "Vos dégâts font regagner autant de PV.",
            "6 🟩 : Regagnez 5 % de vos PV max.",
            "Tant que vous avez plus de la moitié de vos PV max, +2 dégâts de mot.",
            "La première fois que vous mourrez, vous revenez à 50 % de vos PV max à la place."
        ],
        activeAbilityLevel: 1,
        activeAbilityCost: 6
    },
    warrior: {
        name: "Guerrier.ère",
        emoji: "⚔️",
        descriptions: [
            "+1 dégât de mot.",
            "Augmente de 1 tous vos dégâts à la place.",
            "Si vous trouvez le mot en 3 essais ou moins, x2 dégâts de mot.",
            "20 🟩 : Double tous les dégâts au monstre ce tour-ci (y compris rétroactif). Max 1 fois par tour."
        ],
        activeAbilityLevel: 3,
        activeAbilityCost: 20
    },
    mage: {
        name: "Mage",
        emoji: "✨",
        descriptions: [
            "+1 essai mais -1 dégât de mot.",
            "Vos 🟡 rapportent aussi 1 🟩.",
            "6 🟩 : Faites 2 dégâts. Cette capacité fait +1 dégât ce tour.",
            "Lorsqu'un joueur trouve le mot, doublez le gain des 🟩 de l'essai."
        ],
        activeAbilityLevel: 2,
        activeAbilityCost: 6
    },
    hunter: {
        name: "Chasseur.se",
        emoji: "🏹",
        descriptions: [
            "Au début de chaque monstre, faites autant de dégâts que votre Niveau.",
            "Vos 🟩 rapportent aussi 1 XP.",
            "14 🟩 : Désactive un effet du monstre. Max 1 fois par monstre.",
            "Chaque monstre tué rapporte 50 % d'XP en plus."
        ],
        activeAbilityLevel: 2,
        activeAbilityCost: 14
    },
    barbarian: {
        name: "Barbare",
        emoji: "💢",
        descriptions: [
            "Chaque mot avec au moins 1 ⬛ rapporte 1 🟩.",
            "6 🟩 : Ce tour, faites 1 dégât tous les 4 ⬛ que vous faites.",
            "Si vous avez fait 10 ⬛ ou plus, x2 dégâts de mot.",
            "Vos dégâts de mot augmentent avec les essais au lieu de diminuer."
        ],
        activeAbilityLevel: 1,
        activeAbilityCost: 6
    },
    rogue: {
        name: "Roublard.e",
        emoji: "🧤",
        descriptions: [
            "Quand vous achetez un objet, il gagne 33 % de charges.",
            "Quand un de vos objets casse, faites 5 dégâts.",
            "Les objets à utilisation unique s'activent une fois supplémentaire.",
            "25 🟩 : Gagnez votre 🟡 max en 🟡."
        ],
        activeAbilityLevel: 3,
        activeAbilityCost: 25
    }
});
type PlayerClassKey = keyof typeof playerClassAttributesRepository;

export default abstract class PlayerClass extends ListenerSource {
    player?: BosslePlayer;
    level = 0;
    extraData?: Record<string, any>;

    get key() { return this.constructor.name.slice(0, 1).toLowerCase() + this.constructor.name.slice(1) as PlayerClassKey; }
    get name() { return playerClassAttributesRepository[this.key].name; }
    get emoji() { return playerClassAttributesRepository[this.key].emoji; }
    get descriptions() { return playerClassAttributesRepository[this.key].descriptions; }
    get activeAbilityLevel() { return playerClassAttributesRepository[this.key].activeAbilityLevel; }
    get activeAbilityCost() { return playerClassAttributesRepository[this.key].activeAbilityCost; }

    constructor(game: BossleGame) {
        super(game);
    }

    get price() {
        return [1, 2, 4][this.level];
    }

    get totalPrice() {
        return range(this.level).reduce((a, e) => a + [1, 2, 4][e]!, 0);
    }

    giveTo(player: BosslePlayer) {
        if (this.player) return;
        this.player = player;
        this.player.classes.push(this);
        this.level0();
    }
    
    levelUp() {
        if (this.level >= 3) return;
        this.level++;
        switch (this.level) {
            case 1:
                this.level1();
                break;
            case 2:
                this.level2();
                break;
            case 3:
                this.level3();
                break;
        }
    }

    level0() { }
    level1() { }
    level2() { }
    level3() { }

    abstract activeAbility(): boolean;

    toString() {
        return `${this.emoji} **${this.name}**`;
    }

    toCondensed() {
        return `${this.emoji} (${this.level})`;
    }

    serialize() {
        return {
            cls: this.constructor.name as keyof ConcreteClasses,
            level: this.level,
            data: this.extraData
        };
    }
}

export class Seer extends PlayerClass {
    level0(): void {
        this.on("turnStart", () => {
            const letter = this.game.revealLetter((letter) =>
                this.level < 2
                    ? !this.game.targetWord.includes(letter)
                    : this.game.targetWord.includes(letter) && isConsonant(letter)
            );
            if (letter) {
                this.game.channel?.send(`### ${this.emoji} La lettre \`${letter}\` ${this.level < 2 ? "n'est pas dans le mot!" : "est dans le mot!"}`);
            }
        });
    }

    level3(): void {
        this.on("attempt", ({ player, attempt }) => {
            if (player !== this.player) return;
            for (const letter of attempt) {
                if (this.game.revealedLetters.has(letter)) {
                    this.player.damageMonster(1);
                }
            }
        });
    }

    activeAbility(): boolean {
        const letter = this.game.revealLetter((letter) => !this.game.targetWord.includes(letter));
        if (!letter) return false;
        this.game.channel?.send(`### ${this.emoji} La lettre \`${letter}\` n'est pas dans le mot!`);
        return true;
    }
}

export class Armorsmith extends PlayerClass {
    extraData = { protectedLetters: [] as Array<String>, protectionActive: false, protectedPlayers: [] as Array<String> };

    level0(): void {
        this.on("editResultPlayers", (context) => {
            if (context.player !== this.player) return;
            const newResult = [];
            for (const [i, result] of context.result.entries()) {
                if (result !== WordleResult.INCORRECT) {
                    newResult.push(result);
                    continue;
                }
                if (!this.extraData.protectedLetters.includes(context.attempt[i]!)) {
                    newResult.push(result);
                    this.extraData.protectedLetters.push(context.attempt[i]!);
                    continue;
                }
                newResult.push(WordleResult.NONE);
            }
            context.result = newResult;
        });
        this.on("turnEnd", () => {
            this.extraData.protectedLetters.length = 0;
        });
    }

    level1(): void {
        this.on("editResultPlayers", (context) => {
            if (context.player !== this.player) return;
            if (context.player.attempts.length > 1) return;
            context.result = context.result.map((e) => e === WordleResult.INCORRECT ? WordleResult.NONE : e);
        });
    }

    level2(): void {
        this.on("finished", (context) => {
            if (context.player !== this.player) return;
            if (this.player.attempts.flatMap((e) => this.game.attemptToResult(e)).filter((e) => e === WordleResult.INCORRECT).length >= 6) {
                context.damage += 2;
            }
        });
    }

    level3(): void {
        this.on("editResultPlayers", (context) => {
            if (!this.extraData.protectionActive) return;
            if (this.extraData.protectedPlayers.includes(context.player.user.id)) return;
            const index = context.result.findIndex((e) => e === WordleResult.INCORRECT);
            if (index > -1) context.result[index] = WordleResult.NONE;
            if (context.player.finished) {
                this.extraData.protectedPlayers.push(context.player.user.id);
            }
        });
    }

    activeAbility(): boolean {
        this.extraData.protectionActive = true;
        this.extraData.protectedPlayers.length = 0;
        this.game.channel?.send(`### ${this.emoji} Le prochain essai de chaque joueur.se ignore le premier \`⬛\` de chaque mot!`);
        return true;
    }
}

export class Merchant extends PlayerClass {
    extraData = { usedAbility: false };
    
    level0(): void {
        this.on("turnStart", () => {
            this.game.refreshes--;
        });
    }

    level1(): void {
        this.on("result", (context) => {
            if (context.player !== this.player) return;
            context.totalGold += context.result.filter((e) => e === WordleResult.CORRECT).length;
        });
    }

    level2(): void {
        this.on("editGainGold", (context) => {
            if (this.extraData.usedAbility) context.amount *= 2;
        });
        this.on("turnEnd", () => {
            this.extraData.usedAbility = false;
        });
    }

    level3(): void {
        this.on("gainGold", ({ amount }) => {
            if (amount < 0) this.player?.damageMonster(1);
        });
    }

    activeAbility(): boolean {
        if (this.extraData.usedAbility) return false;
        this.extraData.usedAbility = true;
        this.game.gainGold(this.game.turnGoldChange);
        this.game.channel?.send(`### ${this.emoji} Les gains d'🟡 Or sont doublés ce tour-ci!`);
        return true;
    }
}

export class Priest extends PlayerClass {
    extraData = { preventedDeath: false };

    level0(): void {
        this.on("monsterDamage", ({ player, amount }) => {
            if (player !== this.player) return;
            this.game.gainHealth(amount);
        });
    }

    level2(): void {
        this.on("finished", (context) => {
            if (context.player !== this.player) return;
            if (this.game.health >= this.game.maxHealth / 2) {
                context.damage += 2;
            }
        });
    }

    level3(): void {
        this.on("lastBreath", async ({ prevent }) => {
            if (prevent || this.extraData.preventedDeath) return;
            prevent = true;
            this.extraData.preventedDeath = true;
            this.game.health = Math.round(this.game.maxHealth / 2);
            this.game.channel?.send(`### ${this.emoji} Vous avez un second souffle!`);
        });
    }

    activeAbility(): boolean {
        const amount = Math.round(this.game.maxHealth / 20);
        this.game.gainHealth(amount);
        this.game.channel?.send(`### ${this.emoji} Vous regagnez ${amount}!`);
        return true;
    }
}

export class Warrior extends PlayerClass {
    extraData = { usedAbility: false };

    level0(): void {
        this.on("finished", (context) => {
            if (context.player !== this.player) return;
            if (this.level === 0) context.damage++;
        });
    }

    level1(): void {
        this.on("editMonsterDamage", (context) => {
            if (context.player !== this.player) return;
            context.amount++;
        });
    }

    level2(): void {
        this.on("finished", (context) => {
            if (context.player !== this.player) return;
            if (this.player.attempts.length <= 3) context.factor *= 2;
        });
    }

    level3(): void {
        this.on("editMonsterDamage", (context) => {
            if (this.extraData.usedAbility) context.factor *= 2;
        });
        this.on("turnEnd", () => {
            this.extraData.usedAbility = false;
        });
    }

    activeAbility(): boolean {
        if (this.extraData.usedAbility) return false;
        this.extraData.usedAbility = true;
        this.player?.damageMonster(this.game.monster.turnHealthChange);
        this.game.channel?.send(`### ${this.emoji} Les dégâts au monstre sont doublés ce tour-ci!`);
        return true;
    }
}

export class Mage extends PlayerClass {
    extraData = { bonusDmg: 0 };

    level0(): void {
        this.on("turnStart", () => {
            this.player!.maxAttempts++;
        });
        this.on("finished", (context) => {
            if (context.player !== this.player) return;
            context.damage--;
        });
    }

    level1(): void {
        this.on("result", (context) => {
            if (context.player !== this.player) return;
            context.totalMana += context.result.filter((e) => e === WordleResult.WRONG_PLACE).length;
        });
    }

    level2(): void {
        this.on("turnEnd", () => {
            this.extraData.bonusDmg = 0;
        });
    }

    level3(): void {
        this.on("result", (context) => {
            if (context.player.finished) {
                context.totalMana += context.result.filter((e) => e === WordleResult.CORRECT).length;
            }
        });
    }

    activeAbility(): boolean {
        const amount = 2 + this.extraData.bonusDmg;
        this.player?.damageMonster(amount);
        this.extraData.bonusDmg++;
        this.game.channel?.send(`### ${this.emoji} Le monstre a pris ${amount} dégâts!`);
        return true;
    }
}

export class Hunter extends PlayerClass {
    extraData = { usedAbility: false };

    level0(): void {
        this.on("newMonster", () => {
            this.player!.damageMonster(this.game.level);
        });
    }

    level1(): void {
        this.on("result", (context) => {
            if (context.player !== this.player) return;
            context.totalXp += context.result.filter((e) => e === WordleResult.CORRECT).length;
        });
    }

    level2(): void {
        this.on("newMonster", () => {
            this.extraData.usedAbility = false;
        });
    }

    level3(): void {
        this.on("defeated", (context) => {
            context.xp = Math.round(context.xp * 1.5);
        });
    }

    activeAbility(): boolean {
        if (this.extraData.usedAbility) return false;
        this.extraData.usedAbility = true;
        const effect = randomlyPick(this.game.monsterEffects.filter((e) => e.disablable));
        if (!effect) {
            return false;
        }
        this.game.monsterEffects.splice(this.game.monsterEffects.indexOf(effect), 1);
        effect.destroy();
        this.game.channel?.send(`### ${this.emoji} L'effet ${effect} a été neutralisé!`);
        return true;
    }
}

export class Barbarian extends PlayerClass {
    extraData = { incorrects: -1 };

    level0(): void {
        this.on("result", (context) => {
            if (context.player !== this.player) return;
            if (context.result.some((e) => e === WordleResult.INCORRECT)) context.totalMana++;
        });
    }

    level1(): void {
        this.on("result", (context) => {
            if (context.player !== this.player) return;
            if (this.extraData.incorrects === -1) return;
            this.extraData.incorrects += context.result.filter((e) => e === WordleResult.INCORRECT).length;
            if (this.extraData.incorrects >= 4) {
                this.player.damageMonster(Math.floor(this.extraData.incorrects / 4));
                this.extraData.incorrects %= 4;
            }
        });
        this.on("turnEnd", () => {
            this.extraData.incorrects = -1;
        });
    }

    level2(): void {
        this.on("finished", (context) => {
            if (context.player !== this.player) return;
            if (this.player.attempts.flatMap((e) => this.game.attemptToResult(e)).filter((e) => e === WordleResult.INCORRECT).length >= 10) {
                context.factor *= 2;
            }
        });
    }

    level3(): void {
        this.on("finished", (context) => {
            if (context.player !== this.player) return;
            context.damage = context.damage - this.player.maxAttempts - 1 + 2 * this.player.attempts.length;
        });
    }

    activeAbility(): boolean {
        if (this.extraData.incorrects > -1) return false;
        this.extraData.incorrects = 0;
        this.game.channel?.send(`### ${this.emoji} ${this.player} s'enrage!`);
        return true;
    }
}

export class Rogue extends PlayerClass {
    level0(): void {
        this.on("buy", (context) => {
            if (context.player !== this.player) return;
            context.item.uses = Math.round(context.item.uses * 1.33);
        });
    }

    level1(): void {
        this.on("itemBreak", ({ item }) => {
            if (item.owner !== this.player) return;
            this.player?.damageMonster(5);
        });
    }

    level2(): void {
        this.on("buy", (context) => {
            if (context.item.uses === 0) {
                context.item.buy(context.player);
            }
        });
    }

    activeAbility(): boolean {
        this.game.gainGold(this.game.maxGold);
        this.game.channel?.send(`### ${this.emoji} Vous avez (légitimement) gagné ${this.game.maxGold} 🟡 Or!`);
        return true;
    }
}
