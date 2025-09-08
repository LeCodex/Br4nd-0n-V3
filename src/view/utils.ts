import { ButtonInteraction, ButtonStyle, Message } from "discord.js";
import View, { Button } from ".";

export class ConfirmView extends View {
    constructor(private readonly callback: (interaction: ButtonInteraction, confirmed: boolean) => Promise<void>, message?: Message) {
        super(message)
    }

    @Button({ style: ButtonStyle.Success, label: "Confirmer" })
    public async confirm(interaction: ButtonInteraction) {
        return this.callback(interaction, true);
    }

    @Button({ style: ButtonStyle.Danger, label: "Annuler" })
    public async cancel(interaction: ButtonInteraction) {
        return this.callback(interaction, false);
    }
}