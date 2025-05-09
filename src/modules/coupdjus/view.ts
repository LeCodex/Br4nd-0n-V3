import { Message, ButtonStyle, MessageComponentInteraction } from "discord.js";
import CoupdjusGame from "./game";
import GameView from "modules/game/view";
import { NUMBER_EMOJIS } from "utils";

export default class CoupdjusView extends GameView<CoupdjusGame> {
    constructor(game: CoupdjusGame, message?: Message) {
        super(game, message);
        for (const [i, emoji] of NUMBER_EMOJIS.slice(0, 6).entries()) {
            this.setButton({
                row: Math.floor(i/3),
                emoji: emoji.toString(),
                style: ButtonStyle.Secondary,
                callback: async (interaction) => {
                    await this.callback(interaction, i);
                },
            });
        }
    }

    public async callback(interaction: MessageComponentInteraction, index: number) {
        await this.game.tryAndPlayFruit(interaction, index);
    }
}