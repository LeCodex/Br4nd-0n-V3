import { ChatInputCommandInteraction } from "discord.js";
import GameModule from "modules/game/base";
import BingoidGame from "./game";

export default class Bingoid extends GameModule() {
    name = "Bingoid"
    description = "La bouboule"
    color = 0x45fe66
    cls = BingoidGame

    constructor() {
        super("bingoid");
    }

    protected async instantiate(interaction: ChatInputCommandInteraction): Promise<BingoidGame> {
        return new BingoidGame(this, interaction.channelId);
    }
}