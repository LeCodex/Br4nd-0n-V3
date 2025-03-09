import { ChatInputCommandInteraction } from "discord.js";
import humanizeDuration from "humanize-duration";
import { BotCommand, BotModule } from "./base";
import { client } from "client";

export default class Ping extends BotModule {
    name: string = "Ping";
    description: string = "Pong!";
    commandName: string = "ping";
    color: number = 0x00ffff;
    ready: boolean = true;
    dmPermission: boolean = true;
    
    @BotCommand({ description: "Pong!", dmPermission: true })
    public async ping(interaction: ChatInputCommandInteraction) {
        await interaction.reply({
            embeds: [{
                description: "🏓 Pong! (**" + (Date.now() - interaction.createdTimestamp)
                    + " ms**).\n🤖 __" + client.user?.username + "__ has been up for **" + humanizeDuration(client.uptime ?? 0, { largest: 2, round: true, conjunction: " and ", serialComma: false })
                    + "**.\n🔄 Average websocket ping: **" + client.ws.ping + " ms**.",
                color: this.color
            }]
        })
    }
}