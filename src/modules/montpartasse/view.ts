import GameView from "modules/game/view";
import MontpartasseGame from "./game";
import { Message, StringSelectMenuInteraction } from "discord.js";

export default class MontpartasseView extends GameView<MontpartasseGame> {
    constructor(game: MontpartasseGame, message?: Message) {
        super(game, message);
        this.setStringSelect({
            minValues: 1,
            maxValues: 1,
            placeholder: "Echanger une tasse...",
            options: this.game.stack.map(
                (e, i) => ({ emoji: e.emoji, label: `${i+1}. ${e.name} ${e.player ? `de ${e.player.user.displayName}` : ""}`, description: e.description, value: i.toString() })
            ),
            callback: async (interaction) => { this.game.swapCup(interaction as StringSelectMenuInteraction) }
        });
    }
}