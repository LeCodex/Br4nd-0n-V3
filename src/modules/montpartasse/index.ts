import { ChatInputCommandInteraction, Emoji, MessageFlags } from "discord.js";
import { Game, GameCommand } from "../game";
import MontpartasseGame from "./game";
import GameModule from "../game/base";
import { getEmoji }from "src/utils";

export default class Montpartasse extends GameModule() {
    cls = MontpartasseGame;
    name = "Montpartasse";
    description = "S'amuse à empiler des tasses de toutes les couleurs";
    color = 0xFF69B4;
    emojis: Record<string, string | Emoji> = {};

    constructor() {
        super("montpartasse");
    }

    public async onLoaded(): Promise<void> {
        const setEmoji = async (key: string, name: string, fallback: string) => {
            this.emojis[key] = await getEmoji(name, fallback)
        }
        await Promise.all([
            setEmoji("blue", "tbleu", "🟦"),
            setEmoji("orange", "torange", "🟧"),
            setEmoji("green", "tvert", "🟩"),
            setEmoji("purple", "tviolet", "🟪"),
            setEmoji("rainbow", "lgbtasse", "❔"),
            setEmoji("cotton", "tcoton", "⚪"),
            setEmoji("cactus", "tcatcus", "🌵"),
            setEmoji("upsideDown", "essat", "❓"),
            setEmoji("paint", "tpeinture", "🎨"),
            setEmoji("random", "aleatasse", "🎲"),
            setEmoji("thief", "tvol", "🕵️‍♂️"),
            setEmoji("car", "tvoiture", "🚗"),
            setEmoji("iridium", "tiridium", "⚫"),
        ]);
        await super.onLoaded();
    }

    protected async instantiate(interaction: ChatInputCommandInteraction): Promise<Game> {
        return new MontpartasseGame(this, interaction.channelId);
    }

    @GameCommand({ subcommand: "show", description: "Renvoie le message du jeu", pausable: false })
    public async show(game: MontpartasseGame, interaction: ChatInputCommandInteraction) {
        await game.sendBoard(false, true);
        await interaction.reply({ content: "Resent", flags: MessageFlags.Ephemeral });
    }
}