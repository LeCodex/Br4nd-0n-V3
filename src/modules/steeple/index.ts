import GameModule from "modules/game/base";
import SteepleGame from "./game";
import { ApplicationCommandOptionType, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { GameCommand } from "modules/game";

export default class Steeple extends GameModule() {
    cls = SteepleGame;
    name = "Steeple";
    description = "Organise des courses de chaise";
    color = 0xC1694F;

    constructor() {
        super("steeple");
    }

    protected async instantiate(interaction: ChatInputCommandInteraction): Promise<SteepleGame> {
        return new SteepleGame(this, interaction.channelId);
    }

    public async onToggled(game: SteepleGame): Promise<void> {
        if (game.paused) {
            clearTimeout(game.timeout);
            delete game.timeout;
        } else {
            game.setupTimeout(false);
        }
    }

    public async onDeleted(game: SteepleGame): Promise<void> {
        clearTimeout(game.timeout);
    }

    @GameCommand({
        subcommand: "move", description: "Remonte en première place, ou descend à la place donnée", options: [
            { name: "place", type: ApplicationCommandOptionType.Integer, description: "La place voulue" }
        ]
    })
    async move(game: SteepleGame, interaction: ChatInputCommandInteraction) {
        await game.moveOrder(interaction, interaction.options.get("place")?.value as number | undefined)
    }

    @GameCommand({ subcommand: "show", description: "Renvoie le message du jeu", pausable: false })
    async show(game: SteepleGame, interaction: ChatInputCommandInteraction) {
        await game.sendBoardAndSave(false, true);
        await interaction.reply({ content: "Resent", flags: MessageFlags.Ephemeral });
    }

    @GameCommand({ subcommand: "rank", description: "Affiche le classement", pausable: false })
    async rank(game: SteepleGame, interaction: ChatInputCommandInteraction) {
        await interaction.reply({ embeds: [game.rankEmbed] });
    }
}