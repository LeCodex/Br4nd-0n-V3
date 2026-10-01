import { ButtonInteraction, ButtonStyle, Message, MessageComponentInteraction, MessageFlags, SelectMenuComponentOptionData, StringSelectMenuInteraction } from "discord.js";
import GameView from "../game/view";
import BossleGame, { ALL_CLASSES, ConcreteClasses } from "./game";
import ShopItem from "./item";
import BosslePlayer from "./player";

export default class BossleView extends GameView<BossleGame> {
    constructor(game: BossleGame, message?: Message) {
        super(game, message);

        for (const [i, item] of this.game.shop.entries()) {
            this.setButton({
                emoji: item?.emoji ?? "🔁",
                style: item ? ButtonStyle.Primary : ButtonStyle.Secondary,
                callback: async (interaction) => {
                    const player = this.game.getPlayer(interaction.user);
                    if (!player.shopAllowed) {
                        await interaction.reply({ content: "Vous devez avoir terminé vos essais aujourd'hui ou hier pour interagir avec le marché", flags: MessageFlags.Ephemeral });
                        return;
                    }

                    if (item) {
                        await this.callback(item, interaction);
                    } else {
                        await this.refresh(i, interaction);
                    }
                }
            });
        }

        this.setButton({
            emoji: "⏫",
            label: "Amélioration",
            style: ButtonStyle.Success,
            callback: async (interaction) => {
                const player = this.game.getPlayer(interaction.user);
                await new UpgradeView(this.game, player).reply(interaction as ButtonInteraction, { content: `Vous avez ${player.availablePoints} 🔷 disponibles`, flags: MessageFlags.Ephemeral })
            }
        });
        this.setButton({
            emoji: "✨",
            label: "Pouvoir",
            style: ButtonStyle.Success,
            callback: async (interaction) => {
                const player = this.game.getPlayer(interaction.user);
                if (!player.classes.some((e) => e.level >= e.activeAbilityLevel && e.activeAbilityCost >= game.mana)) {
                    await interaction.reply({ content: "Vous n'avez pas de pouvoirs activables", flags: MessageFlags.Ephemeral });
                    return;
                }
                await new PowerView(this.game, player).reply(interaction as ButtonInteraction, { content: `Vous avez ${game.mana} 🟩 disponibles`, flags: MessageFlags.Ephemeral })
            }
        });
    }

    async callback(item: ShopItem | undefined, interaction: MessageComponentInteraction) {
        if (!item) {
            return interaction.reply({ content: "Il n'y a pas d'objet à acheter ici", flags: MessageFlags.Ephemeral });
        } else if (item.cost > this.game.gold) {
            return interaction.reply({ content: "Vous n'avez pas assez d'🟡 Or", flags: MessageFlags.Ephemeral });
        }
        const player = this.game.getPlayer(interaction.user);
        const successful = item.buy(player);
        if (successful) {
            this.game.emit("buy", { player, item });
            this.game.gainGold(-item.cost);
            this.game.shop[this.game.shop.indexOf(item)] = undefined;
        }
        await this.game.sendBoard({ edit: true });
        await interaction.deferUpdate();
        await this.game.save();
    }

    public async refresh(index: number, interaction: MessageComponentInteraction) {
        if (this.game.shop[index]) {
            return interaction.reply({ content: "L'objet est encore présent", flags: MessageFlags.Ephemeral });
        } else if (this.game.refreshCost > this.game.gold) {
            return interaction.reply({ content: "Vous n'avez pas assez d'🟡 Or", flags: MessageFlags.Ephemeral });
        }
        this.game.gainGold(-this.game.refreshCost);
        this.game.refreshes++;
        this.game.shop[index] = this.game.pickRandomUniqueShopItem();
        await this.game.sendBoard({ edit: true });
        await interaction.deferUpdate();
        await this.game.save();
    }
}

export class UpgradeView extends GameView<BossleGame> {
    constructor(game: BossleGame, player: BosslePlayer, message?: Message) {
        super(game, message);

        const options: SelectMenuComponentOptionData[] = []
        for (const cls of player.classes) {
            if (cls.price === undefined) continue;
            options.push({
                emoji: cls.emoji,
                label: `${cls.name} (Niv ${cls.level + 1}, ${cls.price} 🔷)`,
                description: cls.descriptions[cls.level + 1],
                value: cls.constructor.name
            });
        }
        const newClasses: Record<string, InstanceType<ConcreteClasses[keyof ConcreteClasses]>> = {};
        const newClassPrice = player.classes.length;
        for (const cls of ALL_CLASSES.filter((e) => !player.classes.some((c) => c instanceof e))) {
            const instance = new cls(game);
            newClasses[cls.name] = instance;
            options.push({
                emoji: instance.emoji,
                label: `${instance.name} (Lvl 0, ${newClassPrice} 🔷)`,
                description: instance.descriptions[0],
                value: cls.name
            });
        }

        this.setStringSelect({
            options: options,
            callback: async (interaction) => {
                const value = (interaction as StringSelectMenuInteraction).values[0]!;
                const existing = player.classes.find((e) => e.constructor.name === value);
                const suffix = () => `${player.availablePoints > 0 ? `. Il vous reste ${player.availablePoints} 🔷 Points à dépenser` : ""}`;
                if (existing) {
                    if (existing.price === undefined) {
                        await interaction.reply({ content: "La classe n'est pas améliorable", flags: MessageFlags.Ephemeral });
                        return;
                    } else if (existing.price > player.availablePoints) {
                        await interaction.reply({ content: "Vous n'avez pas assez de 🔷 Points", flags: MessageFlags.Ephemeral });
                        return;
                    }
                    player.pointsSpents += existing.price;
                    existing.levelUp();
                    await this.game.sendBoard({ edit: true });
                    await this.parentInteraction?.deleteReply();
                    await interaction.reply({ content: `Vous avez amélioré votre classe de ${existing}${suffix()}`, flags: MessageFlags.Ephemeral });
                    await this.game.save();
                } else if (newClasses[value]) {
                    const instance = newClasses[value];
                    if (newClassPrice > player.availablePoints) {
                        await interaction.reply({ content: "Vous n'avez pas assez de 🔷 Points", flags: MessageFlags.Ephemeral });
                        return;
                    }
                    player.pointsSpents += newClassPrice;
                    instance.giveTo(player);
                    await this.game.sendBoard({ edit: true });
                    await this.parentInteraction?.deleteReply();
                    await interaction.reply({ content: `Vous avez gagné la classe de ${instance}${suffix()}`, flags: MessageFlags.Ephemeral });
                    await this.game.save();
                } else {
                    await interaction.deferReply();
                }
            }
        })
    }
}

export class PowerView extends GameView<BossleGame> {
    constructor(game: BossleGame, player: BosslePlayer, message?: Message) {
        super(game, message);

        const usableAbilities = player.classes.filter((e) => e.activeAbilityLevel >= e.level && e.activeAbilityCost >= game.mana);
        for (const cls of usableAbilities) {
            this.setButton({
                emoji: cls.emoji,
                label: `${cls.name} (${cls.activeAbilityCost} 🟩)`,
                style: ButtonStyle.Success,
                callback: async (interaction) => {
                    if (cls.activeAbilityCost > game.mana) {
                        await interaction.reply({ content: "Vous n'avez pas assez de 🟩 Mana", flags: MessageFlags.Ephemeral });
                        return;
                    }
                    const successful = cls.activeAbility();
                    if (successful) {
                        await this.parentInteraction?.deleteReply();
                        game.gainMana(-cls.activeAbilityCost);
                        await interaction.deferReply();
                    } else {
                        await interaction.reply({ content: "Vous ne pouvez pas utiliser cette capacité pour le moment", flags: MessageFlags.Ephemeral })
                    }
                }
            });
        }
    }
}
