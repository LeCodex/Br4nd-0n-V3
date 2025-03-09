import { ApplicationCommandOptionType, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { GameCommand } from "modules/game"
import GameModule from "../game/base";
import CompoteDePommesGame from "./game";

export default class CompoteDePommes extends GameModule() {
    protected cls = CompoteDePommesGame;
    name: string = "Compote de Pommes";
    description: string = "Lancer un dé, c'est fort en pomme";
    color: number = 0xdd2e44;
    commandName: string = "compote";

    protected async instantiate(interaction: ChatInputCommandInteraction) {
        return new CompoteDePommesGame(this, interaction.channelId);
    }

    @GameCommand({ subcommand: "roll", description: "Lance un dé et hurle une lettre" })
    public async roll(game: CompoteDePommesGame, interaction: ChatInputCommandInteraction) {
        return game.roll(interaction);
    }

    @GameCommand({ subcommand: "rank", description: "Affiche le classement" })
    public async rank(game: CompoteDePommesGame, interaction: ChatInputCommandInteraction) {
        return interaction.reply({ embeds: [game.rankEmbed] });
    }

    @GameCommand({ subcommand: "rules", description: "Affiche les effets" })
    public async rules(game: CompoteDePommesGame, interaction: ChatInputCommandInteraction) {
        return interaction.reply({ embeds: [game.rulesEmbed] });
    }

    @GameCommand({
        subcommand: "info", description: "Affiche les infos d'un joueur", options: [
            { name: "player", description: "Un joueur", type: ApplicationCommandOptionType.User }
        ]
    })
    public async info(game: CompoteDePommesGame, interaction: ChatInputCommandInteraction) {
        const player = game.players[interaction.options.get("player")?.user?.id ?? interaction.user.id];
        if (!player) {
            return interaction.reply({ content: "Cet utilisateur n'est pas dans la partie", flags: MessageFlags.Ephemeral });
        }
        return interaction.reply({ embeds: [{ title: `Info de ${player.user.displayName}`, description: player.summary, color: this.color }] });
    }
}