import { ApplicationCommandOptionType, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { AdminGameCommand, GameCommand } from "modules/game"
import GameModule from "../game/base";
import CompoteDePommesGame from "./game";

export default class CompoteDePommes extends GameModule() {
    protected cls = CompoteDePommesGame;
    name: string = "Compote de Pommes";
    description: string = "Lancer un dé, c'est fort en pomme";
    color: number = 0xdd2e44;

    constructor() {
        super("compote");
    }

    public async onToggled(game: CompoteDePommesGame): Promise<void> {
        if (game.paused) {
            clearTimeout(game.refillTimeout);
            delete game.refillTimeout;
        } else {
            game.setupTimeout();
        }
    }

    public async onDeleted(game: CompoteDePommesGame): Promise<void> {
        clearTimeout(game.refillTimeout);
    }

    protected async instantiate(interaction: ChatInputCommandInteraction) {
        return new CompoteDePommesGame(this, interaction.channelId);
    }

    @GameCommand({ subcommand: "roll", description: "Lance un dé et hurle une lettre" })
    public async roll(game: CompoteDePommesGame, interaction: ChatInputCommandInteraction) {
        return game.roll(interaction);
    }

    @GameCommand({ subcommand: "rank", description: "Affiche le classement", pausable: false })
    public async rank(game: CompoteDePommesGame, interaction: ChatInputCommandInteraction) {
        return interaction.reply({ embeds: [game.rankEmbed] });
    }

    @GameCommand({ subcommand: "rules", description: "Affiche les effets", pausable: false })
    public async rules(game: CompoteDePommesGame, interaction: ChatInputCommandInteraction) {
        return interaction.reply({ embeds: [game.rulesEmbed], flags: MessageFlags.Ephemeral });
    }

    @GameCommand({
        subcommand: "info", description: "Affiche les infos d'un joueur", options: [
            { name: "player", description: "Un joueur", type: ApplicationCommandOptionType.User }
        ], pausable: false
    })
    public async info(game: CompoteDePommesGame, interaction: ChatInputCommandInteraction) {
        const player = game.players[interaction.options.get("player")?.user?.id ?? interaction.user.id];
        if (!player) {
            return interaction.reply({ content: "Cet utilisateur n'est pas dans la partie", flags: MessageFlags.Ephemeral });
        }
        return interaction.reply({ embeds: [{ title: `Info de ${player.user.displayName}`, description: player.summary, color: this.color }], flags: MessageFlags.Ephemeral });
    }

    @AdminGameCommand({ subcommand: "refill", description: "Force une distribution des cueillettes" })
    public async refill(game: CompoteDePommesGame, interaction: ChatInputCommandInteraction) {
        await game.refill();
        return interaction.reply({ content: "Refilled", flags: MessageFlags.Ephemeral });
    }
}