import { CommandInteraction } from "discord.js";
import { BotCommand, BotModule } from "./base";
import humanizeDuration from "humanize-duration";

export default class Ping extends BotModule {
    name: string = "Ping";
    description: string = "Pong!";
    commandName: string = "ping";
    color: number = 0x00ffff;
    ready: boolean = true;
    dmPermission: boolean = true;
    
    @BotCommand({ description: "Pong!", dmPermission: true })
    async ping(interaction: CommandInteraction) {
        await interaction.reply({
            embeds: [{
                description: "🏓 Pong! (**" + (Date.now() - interaction.createdTimestamp)
                    + " ms**).\n🤖 __" + this.client.user?.username + "__ has been up for **" + humanizeDuration(this.client.uptime ?? 0, { largest: 2, round: true, conjunction: " and ", serialComma: false })
                    + "**.\n🔄 Average websocket ping: **" + this.client.ws.ping + " ms**.",
                color: this.color
            }]
        })
    }
}