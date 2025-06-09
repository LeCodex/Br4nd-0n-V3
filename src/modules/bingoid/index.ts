import { ChatInputCommandInteraction, Emoji } from "discord.js";
import GameModule from "modules/game/base";
import BingoidGame from "./game";
import { GameCommand } from "modules/game";
import { getEmoji } from "utils";

export default class Bingoid extends GameModule() {
    name = "Bingoid";
    description = "La bouboule";
    color = 0xfeea45;
    cls = BingoidGame;
    emojis: Record<string, string | Emoji> = {};

    constructor() {
        super("bingoid");
    }

    public async onLoaded(): Promise<void> {
        this.emojis.yellow = await getEmoji("bjaune", "🟡");
        this.emojis.red = await getEmoji("brouge", "🔴");
        this.emojis.orange = await getEmoji("borange", "🟠");
        this.emojis.white = await getEmoji("bblanc", "⚪");
        this.emojis.black = await getEmoji("bgris", "⚫");
        this.emojis.purple = await getEmoji("bmauve", "🟣");
        this.emojis.green = await getEmoji("bvert", "🟢");
        this.emojis.mystery = await getEmoji("essat", "❔");
        await super.onLoaded();
    }

    protected async instantiate(interaction: ChatInputCommandInteraction): Promise<BingoidGame> {
        return new BingoidGame(this, interaction.channelId);
    }

    @GameCommand({ subcommand: "take", description: "Tire la boule suivante" })
    public async take(game: BingoidGame, interaction: ChatInputCommandInteraction) {
        game.takeBall(interaction);
    }

    @GameCommand({ subcommand: "show", description: "Renvoie le message de jeu", pausable: false })
    public async show(game: BingoidGame, interaction: ChatInputCommandInteraction) {
        game.sendBoardAndSave(interaction);
    }
}