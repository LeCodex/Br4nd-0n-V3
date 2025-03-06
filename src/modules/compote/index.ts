import { ApplicationCommandOptionType, CommandInteraction, MessageFlags } from "discord.js";
import { GameCommand, GameModule } from "../game"
import CompoteDePommesGame from "./game";

export default class CompoteDePommes extends GameModule<CompoteDePommesGame> {
    protected cls = CompoteDePommesGame;
    name: string = "Compote de Pommes";
    description: string = "Lancer un dé, c'est fort en pomme";
    color: number = 0xdd2e44;
    commandName: string = "compote";
    ready = true;

    protected instantiate(interaction: CommandInteraction) {
        return new CompoteDePommesGame(this, interaction.channelId);
    }

    @GameCommand({ subcommand: "roll", description: "Lance un dé et hurle une lettre" })
    async roll(game: CompoteDePommesGame, interaction: CommandInteraction) {
        return await game.roll(interaction);
    }

    @GameCommand({ subcommand: "rank", description: "Affiche le classement" })
    async rank(game: CompoteDePommesGame, interaction: CommandInteraction) {
        return await interaction.reply({ embeds: [game.rankEmbed] });
    }

    @GameCommand({ subcommand: "rules", description: "Affiche les effets" })
    async rules(game: CompoteDePommesGame, interaction: CommandInteraction) {
        return await interaction.reply({ embeds: [game.rulesEmbed] });
    }

    @GameCommand({ subcommand: "info", description: "Affiche les infos d'un joueur", options: [{ name: "player", description: "Un joueur", type: ApplicationCommandOptionType.User }] })
    async info(game: CompoteDePommesGame, interaction: CommandInteraction) {
        const player = game.players[interaction.options.get("player")?.user?.id ?? interaction.user.id];
        if (!player) {
            return await interaction.reply({ content: "Cet utilisateur n'est pas dans la partie", flags: MessageFlags.Ephemeral });
        }
        return await interaction.reply({ embeds: [{ title: `Info de ${player.user.displayName}`, description: player.summary, color: this.color }] });
    }
}