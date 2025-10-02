import { ButtonStyle, Message, MessageComponentInteraction, MessageFlags } from "discord.js";
import GameView from "../game/view";
import BossleGame from "./game";
import ShopItem from "./item";

export default class BossleView extends GameView<BossleGame> {
    constructor(game: BossleGame, message?: Message) {
        super(game, message);

        for (const item of this.game.shop) {
            this.setButton({
                emoji: item?.emoji ?? "🚫",
                style: item ? ButtonStyle.Primary : ButtonStyle.Secondary,
                disabled: !item,
                callback: async (interaction) => { await this.callback(item, interaction);  }
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
}
