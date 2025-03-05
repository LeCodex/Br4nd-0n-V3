import { CommandInteraction, MessageFlags } from "discord.js";
import { BotCommand } from "../base";
import { GameModule } from "../game"
import CompoteDePommesGame from "./game";

export default class CompoteDePommes extends GameModule<CompoteDePommesGame> {
    name: string = "Compote de Pommes";
    description: string = "Lancer un dé, c'est fort en pomme";
    color: number = 0xdd2e44;
    commandName: string = "compote";
    ready = true;

    protected instantiate(channelId: string) {
        return new CompoteDePommesGame(channelId);
    }

    @BotCommand({ subcommand: "roll", description: "Lance un dé et hurle une lettre" })
    async roll(interaction: CommandInteraction) {
        const game = this.game(interaction.channelId);
        if (!game) {
            return await interaction.reply({ content: "No game is currently in this channel", flags: MessageFlags.Ephemeral });
        }

        return await game.roll(interaction);
    }

    @BotCommand({ subcommand: "rank", description: "Affiche le classement" })
    async rank(interaction: CommandInteraction) {
        const game = this.game(interaction.channelId);
        if (!game) {
            return await interaction.reply({ content: "No game is currently in this channel", flags: MessageFlags.Ephemeral });
        }

        return await interaction.reply({ embeds: [game.rankEmbed] });
    }

    @BotCommand({ subcommand: "rules", description: "Affiche les effets" })
    async rules(interaction: CommandInteraction) {
        const game = this.game(interaction.channelId);
        if (!game) {
            return await interaction.reply({ content: "No game is currently in this channel", flags: MessageFlags.Ephemeral });
        }

        return await interaction.reply({ embeds: [game.rulesEmbed] });
    }
}