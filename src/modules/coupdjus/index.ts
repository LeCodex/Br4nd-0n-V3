import GameModule from "modules/game/base";
import CoupdjusGame from "./game";
import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Game, GameCommand } from "modules/game";

export default class Coupdjus extends GameModule() {
    cls = CoupdjusGame;
    name = "Coup d'jus";
    description = "Fais des smoothies de manière douteuse";
    color = 0x50E3C2;

    constructor() {
        super("coupdjus");
    }

    public async onToggled(game: CoupdjusGame): Promise<void> {
        if (game.paused) {
            clearTimeout(game.timeout);
            delete game.timeout;
        } else {
            game.setupTimeout();
        }
    }

    public async onDeleted(game: CoupdjusGame): Promise<void> {
        clearTimeout(game.timeout);
        await game.view?.end();
    }

    protected async instantiate(interaction: ChatInputCommandInteraction): Promise<Game> {
        return new CoupdjusGame(this, interaction.channelId);
    }

    @GameCommand({ subcommand: "show", description: "Renvoie le message du jeu", pausable: false })
    public async show(game: CoupdjusGame, interaction: ChatInputCommandInteraction) {
        await game.sendInfoAndSave(undefined, undefined, true, true);
        await interaction.reply({ content: "Resent", flags: MessageFlags.Ephemeral });
    }
}