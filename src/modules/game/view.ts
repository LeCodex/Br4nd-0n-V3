import { Message, MessageComponentInteraction } from "discord.js";
import { Game } from ".";
import View from "view";
import { ComponentHandler } from "interfaces";

export default class GameView<T extends Game> extends View {
    constructor(public game: T, message?: Message) {
        super(message);
    }

    protected filter(interaction: MessageComponentInteraction, handler: ComponentHandler): boolean {
        return !(this.game.paused && (handler.pausable ?? true));
    }
}