import { ButtonStyle, Message, MessageComponentInteraction, MessageFlags } from "discord.js";
import GameView from "../game/view";
import BossleGame from "./game";
import ShopItem from "./item";

export default class BossleView extends GameView<BossleGame> {
    constructor(game: BossleGame, message?: Message) {
        super(game, message);

        for (const [i, item] of this.game.shop.entries()) {
            this.setButton({
                emoji: item?.emoji ?? "🔁",
                style: item ? ButtonStyle.Primary : ButtonStyle.Secondary,
                callback: async (interaction) => {
                    if (item) {
                        await this.callback(item, interaction);
                    } else {
                        await this.refresh(i, interaction);
                    }
                }
            });
        }
    }

    async callback(item: ShopItem | undefined, interaction: MessageComponentInteraction) {
        if (!item) {
            return interaction.reply({ content: "Il n'y a pas d'objet à acheter ici", flags: MessageFlags.Ephemeral });
        } else if (item.cost > this.game.gold) {
            return interaction.reply({ content: "Vous n'avez pas assez d':coin: Or", flags: MessageFlags.Ephemeral });
        }
        const player = this.game.getPlayer(interaction.user);
        const successful = item.buy(player);
        if (successful) {
            this.game.gold -= item.cost;
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
            return interaction.reply({ content: "Vous n'avez pas assez d':coin: Or", flags: MessageFlags.Ephemeral });
        }
        this.game.gold -= this.game.refreshCost
        this.game.refreshes++;
        this.game.shop[index] = this.game.pickRandomUniqueItem();
        await this.game.sendBoard({ edit: true });
        await interaction.deferUpdate();
        await this.game.save();
    }
}
