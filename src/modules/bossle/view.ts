import { ButtonStyle, Message, MessageComponentInteraction, MessageFlags } from "discord.js";
import GameView from "../game/view";
import BossleGame, { ALL_ITEMS } from "./game";
import ShopItem from "./item";
import { randomlyPick } from "../../utils";

export default class BossleView extends GameView<BossleGame> {
    constructor(game: BossleGame, message?: Message) {
        super(game, message);

        for (const item of this.game.shop) {
            this.setButton({
                emoji: item?.emoji ?? "🚫",
                style: item ? ButtonStyle.Primary : ButtonStyle.Secondary,
                disabled: !item,
                callback: async (interaction) => { await this.callback(item, interaction); }
            });
        }
        this.setButton({
            style: ButtonStyle.Success,
            label: "Rafraîchir le magasin",
            row: 1,
            disabled: this.game.shop.every((e) => !!e),
            callback: async (interaction) => { await this.refresh(interaction); }
        });
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

    public async refresh(interaction: MessageComponentInteraction) {
        if (this.game.shop.every((e) => !!e)) {
            return interaction.reply({ content: "Le magasin est encore plein", flags: MessageFlags.Ephemeral });
        } else if (this.game.refreshCost > this.game.gold) {
            return interaction.reply({ content: "Vous n'avez pas assez d':coin: Or", flags: MessageFlags.Ephemeral });
        }
        this.game.gold -= this.game.refreshCost;
        for (const [i, slot] of this.game.shop.entries()) {
            if (!!slot) continue;
            this.game.refreshes++;
            this.game.shop[i] = new (randomlyPick(ALL_ITEMS))(this.game);
        }
        await this.game.sendBoard({ edit: true });
        await interaction.deferUpdate();
        await this.game.save();
    }
}
