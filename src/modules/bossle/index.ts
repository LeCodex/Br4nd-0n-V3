import { ApplicationCommandOptionType, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import GameModule from "../game/base";
import BossleGame from "./game";
import { GameCommand } from "../game";
import { BotCommand } from "../base";
import { itemAttributesRepository } from "./item";
import { effectAttributesRepository } from "./effects";

export default class Bossle extends GameModule() {
    cls = BossleGame;
    name = "Bossle";
    description = "Combat des monstres avec la langue française";
    color = 0xB05EF7;
    words: Set<string>;
    targetWords: Array<string>;
    
    constructor() {
        super("bossle");
        this.words = new Set(this.readConfigFile("fr.txt")!.split("\n").map((e) => e.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()));
        this.targetWords = this.readConfigFile("fr_targets.txt")!.split("\n").map((e) => e.trim());
    }

    protected async instantiate(interaction: ChatInputCommandInteraction): Promise<BossleGame> {
        return new BossleGame(this, interaction.channelId);
    }

    public async onDeleted(game: BossleGame) {
        clearTimeout(game.timeout);
        await game.boardView?.end();
        try { await game.boardView?.message?.unpin(); } catch { }
    }

    @GameCommand({
        subcommand: "submit", description: "Envoie un mot", options: [
            { name: "mot", description: "Le mot à envoyer", type: ApplicationCommandOptionType.String, required: true }
        ]
    })
    public async submit(game: BossleGame, interaction: ChatInputCommandInteraction) {
        await game.sendAttempt(interaction);
    }

    @GameCommand({ subcommand: "info", description: "Envoie le message d'info privée" })
    public async info(game: BossleGame, interaction: ChatInputCommandInteraction) {
        const player = game.getPlayer(interaction.user);
        await interaction.reply({ content: player.privateAttemptContent, flags: MessageFlags.Ephemeral });
    }

    @GameCommand({ subcommand: "show", description: "Envoie le message d'info de partie" })
    public async show(game: BossleGame, interaction: ChatInputCommandInteraction) {
        await game.sendBoard({ ephemeralReplyTo: interaction });
    }

    @BotCommand({ subcommandGroup: "wiki", subcommand: "items", description: "Envoie un récapitulatif des objets" })
    public async items(interaction: ChatInputCommandInteraction) {
        await interaction.reply({
            content: `## Wiki des objets:\n${Object.values(itemAttributesRepository).map((e) => `${e.emoji} **${e.name}** (${e.cost} :coin:): ${e.description}${e.uses ? ` (${e.uses} utilisations)` : ''}`).join('\n')}`,
            flags: MessageFlags.Ephemeral
        });
    }

    @BotCommand({ subcommandGroup: "wiki", subcommand: "effects", description: "Envoie un récapitulatif des effets de monstre" })
    public async effects(interaction: ChatInputCommandInteraction) {
        await interaction.reply({
            content: `## Wiki des effets:\n${Object.values(effectAttributesRepository).map((e) => `${e.emoji} **${e.name}**: ${e.description}`).join('\n')}`,
            flags: MessageFlags.Ephemeral
        });
    }
}
