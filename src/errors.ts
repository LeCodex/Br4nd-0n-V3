import { Client, EmbedBuilder, Interaction } from "discord.js";

export default class ErrorHandler {
    static async handle(client: Client, interaction: Interaction | undefined, error: any) {
        const embed = new EmbedBuilder()
            .setTitle("Something went wrong!")
            .setColor(0xff0000)
            .setDescription("```js\n" + (error instanceof Error ? error.stack : error) + "```");

        const errorChannel = await client.channels.fetch("474301772463341569"); //"<@240947137750237185>"
        if (errorChannel?.isSendable()) await errorChannel.send({ embeds: [embed] });

        if (interaction?.isRepliable() && !interaction.replied) {
            embed.setFooter({ text: "This message will be deleted in one minute" });
            const message = await interaction.reply({
                embeds: [embed]
            });
            setTimeout(async () => await message.delete(), 60000);
        }
    }
}