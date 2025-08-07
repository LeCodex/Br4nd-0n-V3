import { ChatInputCommandInteraction, ApplicationCommandOptionType } from "discord.js";
import { BotModule, BotCommand } from "./base";

// TODO: Make proper macros
export default class GrosseAnim extends BotModule {
    name: string = "Grosse Anim";
    description: string = "Cherchez pas, vous l'aurez pas";
    color: number = 0xff6600;
    ready: boolean = true;
    dmPermission: boolean = true;

    constructor() {
        super("grosseanim");
    }

    public async reply(interaction: ChatInputCommandInteraction, content: string) {
        await interaction.reply({
            embeds: [{
                description: content,
                color: this.color
            }]
        });
    }

    @BotCommand({ description: "Tente ta chance" })
    public async die(interaction: ChatInputCommandInteraction) {
        const sides = 999999;
        await this.reply(interaction, `🎲 Le résultat est **${Math.floor(Math.random() * sides + 1)}**`);
    }
}