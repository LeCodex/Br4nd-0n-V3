import { ChatInputCommandInteraction } from "discord.js";
import GameModule from "modules/game/base";
import BingoidGame from "./game";
import { GameCommand } from "modules/game";

export default class Bingoid extends GameModule() {
    name = "Bingoid"
    description = "La bouboule"
    color = 0xfeea45
    cls = BingoidGame

    constructor() {
        super("bingoid");
    }

    protected async instantiate(interaction: ChatInputCommandInteraction): Promise<BingoidGame> {
        return new BingoidGame(this, interaction.channelId);
    }

    @GameCommand({ subcommand: "take", description: "Tire la boule suivante" })
    public async take(game: BingoidGame, interaction: ChatInputCommandInteraction) {
        game.takeBall(interaction);
    }

    @GameCommand({ subcommand: "show", description: "Renvoie le message de jeu", pausable: false })
    public async show(game: BingoidGame, interaction: ChatInputCommandInteraction) {
        game.sendBoardAndSave(interaction);
    }
}