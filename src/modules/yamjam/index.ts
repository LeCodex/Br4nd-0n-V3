import GameModule from "modules/game/base";
import YamJamGame from "./game";
import { ChatInputCommandInteraction, Emoji, MessageFlags } from "discord.js";
import { getEmoji } from "utils";
import { GameCommand } from "modules/game";

export default class YamJam extends GameModule() {
    readonly cls = YamJamGame;
    name: string = "Yams";
    description: string = "Récupère des dés";
    color: number = 0x4ba250;
    faces: (string | Emoji)[] = [];

    constructor() {
        super("yams");
    }

    public async onLoaded(): Promise<void> {
        this.faces = [
            await getEmoji("Pilier1", "1️⃣"),
            await getEmoji("Pilier2", "2️⃣"),
            await getEmoji("Pilier3", "3️⃣"),
            await getEmoji("Pilier4", "4️⃣"),
            await getEmoji("Pilier5", "5️⃣"),
            await getEmoji("Pilier6", "6️⃣")
        ];
        await super.onLoaded();
    }

    protected async instantiate(interaction: ChatInputCommandInteraction): Promise<YamJamGame> {
        return new YamJamGame(this, interaction.channelId);
    }

    @GameCommand({ subcommand: "show", description: "Renvoie le message du jeu", pausable: false })
    public async show(game: YamJamGame, interaction: ChatInputCommandInteraction) {
        await game.sendMessage(true);
        await game.save();
        await interaction.reply({ content: "Resent", flags: MessageFlags.Ephemeral });
    }
}