import { Client, EmbedBuilder, Interaction, Message, TextChannel } from "discord.js";
import DB from "./db";

export default class ErrorHandler {
    static tempMessages = new Map<Message, number>();

    static async load(client: Client) {
        const messages = await DB.load("errors", "messages", [] as [string, string, number][]);
        for (const [channelId, messageId, timestamp] of messages) {
            const channel = await client.channels.fetch(channelId);
            if (!(channel instanceof TextChannel)) continue;
            const message = await channel.messages.fetch(messageId);
            if (!message) continue;
            await this.addTempMessage(message, timestamp);
        }
        await this.save();
    }

    static async handle(client: Client, interaction: Interaction | undefined, error: any) {
        const embed = new EmbedBuilder()
            .setTitle("Something went wrong!")
            .setColor(0xff0000)
            .setDescription("```js\n" + (error instanceof Error ? error.stack : error) + "```");

        const errorChannel = await client.channels.fetch("474301772463341569"); //"<@240947137750237185>"
        if (errorChannel?.isSendable()) await errorChannel.send({ embeds: [embed] });

        if (interaction?.isRepliable() && !interaction.replied) {
            embed.setFooter({ text: "This message will be deleted in one minute" });
            const response = await interaction.reply({
                embeds: [embed]
            });
            await this.addTempMessage(await response.fetch());
            await this.save();
        }
    }

    static async addTempMessage(message: Message, timestamp: number = Date.now() + 60000) {
        this.tempMessages.set(message, timestamp);
        setTimeout(async () => {
            this.tempMessages.delete(message);
            await message.delete();
            await this.save();
        }, timestamp - Date.now());
    }

    static async save() {
        await DB.save("errors", "messages", [...this.tempMessages.entries()].map(([message, timestamp]) => [message.channelId, message.id, timestamp]));
    }
}