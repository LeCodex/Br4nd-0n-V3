import { ButtonInteraction, ButtonStyle, Client, MessageFlags, TextChannel } from "discord.js";
import DB from "./db";
import View, { Button } from "./view";

class AdminView extends View {
    @Button({ style: ButtonStyle.Primary, label: "Restart", emoji: "🔄" })
    async restart(interaction: ButtonInteraction) {
        await interaction.reply({ content: "The bot will restart", flags: MessageFlags.Ephemeral });
        process.exit();
    }

    @Button({ style: ButtonStyle.Danger, label: "Panic", emoji: "💥" })
    async panic(interaction: ButtonInteraction) {
        throw Error("Panic!");
    }
}

export default class AdminPanel {
    channel?: TextChannel;
    view?: AdminView;

    static _instance: AdminPanel;

    private constructor(public client: Client) { }

    static async load(client: Client) {
        if (!this._instance) {
            this._instance = new this(client);
            await this._instance.loadMessage();
            await this._instance.setupPanel();
        }
        return this._instance;
    }

    private async loadMessage() {
        const save = await DB.get("admin", "message", { channel: process.env.ADMIN_PANEL_CHANNEL!, message: null });
        const channel = await this.client.channels.fetch(save.channel);
        if (channel instanceof TextChannel) {
            this.channel = channel;
            if (save.message) {
                this.view = new AdminView(await this.channel?.messages.fetch(save.message));
            }
        }
    }

    private async setupPanel() {
        if (!this.channel) return;

        const message = {
            embeds: [{
                title: "Admin Panel",
                description: `Admin: ${(await this.client.users.fetch(process.env.ADMIN!)).toString()}`,
                color: 0x990099
            }]
        };

        if (!this.view) {
            this.view = await new AdminView().send(this.channel, message);
            await DB.save("admin", "message", { channel: this.channel?.id, message: this.view.message?.id });
        } else {
            await new AdminView().edit(message);
        }
    }
}