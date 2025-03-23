import GameModule from "modules/game/base";
import DedalleuxGame from "./game";
import { ChatInputCommandInteraction, Emoji, MessageFlags } from "discord.js";
import { Game, GameCommand } from "../game";
import { getEmoji } from "utils";

export default class Dedalleux extends GameModule() {
    protected cls = DedalleuxGame;
    name = "Dédalleux";
    description = "Donne ta liste de course à Brax";
    color = 0x144350;

    colors: Record<string, string | Emoji> = {};
    pawnEmoji: string | Emoji = "📍";

    constructor() {
        super("dedale");
    }

    public async onLoaded(): Promise<void> {
        this.colors.redSquare = await getEmoji("Mur1", "🟥");
        this.colors.blueSquare = await getEmoji("Mur2", "🟦");
        this.colors.greenSquare = await getEmoji("Mur3", "🟩");
        this.colors.yellowSquare = await getEmoji("Mur4", "🟨");
        this.colors.purpleSquare = await getEmoji("Mur5", "🟪");
        this.colors.redCirle = await getEmoji("Pilier1", "🛑");
        this.colors.blueCircle = await getEmoji("Pilier2", "♾️");
        this.colors.greenCircle = await getEmoji("Pilier3", "💚");
        this.colors.yellowCircle = await getEmoji("Pilier4", "📀");
        this.colors.purpleCircle = await getEmoji("Pilier5", "🟣");
        this.pawnEmoji = await getEmoji("brax", "📍");
        await super.onLoaded();
    }

    protected async instantiate(interaction: ChatInputCommandInteraction): Promise<Game> {
        return new DedalleuxGame(this, interaction.channelId);
    }

    @GameCommand({ subcommand: "show", description: "Renvoie le message du jeu" })
    public async show(game: DedalleuxGame, interaction: ChatInputCommandInteraction) {
        await game.sendBoard(true);
        await interaction.reply({ content: "Resent", flags: MessageFlags.Ephemeral });
    }
}
