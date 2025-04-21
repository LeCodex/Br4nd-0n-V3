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
        await game.sendBoard(false, true);
        await interaction.reply({ content: "Resent", flags: MessageFlags.Ephemeral });
    }
}