import { ApplicationCommandOptionType, ChatInputCommandInteraction, SendableChannels } from "discord.js";
import { BotCommand, BotModule } from "./base";
import { client } from "client";

export default class Say extends BotModule {
    public name: string = "Say";
    public description: string = "🤫";
    public color: number = 0x000000;
    protected ready: boolean = true;

    constructor() {
        super("say");
    }

    @BotCommand({
        description: "Nothing to see here", dmPermission: true, options: [
            { type: ApplicationCommandOptionType.String, name: "channel", description: "Le salon", required: true },
            { type: ApplicationCommandOptionType.String, name: "message", description: "Le message", required: true },
        ]
    })
    public async say(interaction: ChatInputCommandInteraction) {
        const channelId = interaction.options.get("channel")?.value as string | undefined;
        const message = interaction.options.get("message")?.value as string | undefined;
        if (channelId && message) {
            const channel = await client.channels.fetch(channelId);
            await (channel as SendableChannels | null)?.send(message);
        }
        await interaction.reply("Sent");
    }
}