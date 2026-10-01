import { Message, MessageComponentInteraction } from "discord.js";
import { Game } from ".";
import View from "src/view";
import { ComponentHandler } from "src/interfaces";

export default class GameView<T extends Game> extends View {
    constructor(public game: T, message?: Message) {
        super(message);
    }

    protected filter(interaction: MessageComponentInteraction, handler: ComponentHandler): boolean {
        return !(this.game.paused && (handler.pausable ?? true));
    }
}
