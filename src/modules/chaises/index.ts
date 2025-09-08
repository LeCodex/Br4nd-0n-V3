import { ChatInputCommandInteraction } from "discord.js";
import { Game, GameAdminCommand, GameCommand } from "modules/game";
import GameModule from "modules/game/base";
import ChaisesGame from "./game";

export default class Chaises extends GameModule() {
    protected cls = ChaisesGame;
    name = "Tasses musicales";
    description = "TOUT LE MONDE VEUT PRENDRE?";
    color = 0xad8d52;

    constructor() {
        super("chaises");
    }

    protected async instantiate(interaction: ChatInputCommandInteraction): Promise<Game> {
        return new ChaisesGame(this, interaction.channelId);
    }

    @GameCommand({ subcommand: "sit", description: "T'asseoie sur une chaise au hasard" })
    public async sit(game: ChaisesGame, interaction: ChatInputCommandInteraction) {
        const player = game.getPlayerFromUser(interaction.user);
        await player.rollDice(interaction);
    }

    @GameCommand({ subcommand: "show", description: "Renvoie le dernier message de jeu", pausable: false })
    public async show(game: ChaisesGame, interaction: ChatInputCommandInteraction) {
        await game.resendMessage(interaction);
    }

    @GameAdminCommand({ subcommand: "score", description: "Vide les chaises et score les joueurs" })
    public async score(game: ChaisesGame, interaction: ChatInputCommandInteraction) {
        await game.clearAndScore(interaction);
    }
}