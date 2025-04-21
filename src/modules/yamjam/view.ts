import { Message, ButtonStyle, MessageComponentInteraction, ButtonInteraction, MessageFlags } from "discord.js";
import { Button } from "view";
import YamJamGame from "./game";
import YamJamPlayer from "./player";
import GameView from "modules/game/view";
import { ComponentHandler } from "interfaces";

export default class YamJamView extends GameView<YamJamGame> {
    constructor(game: YamJamGame, message?: Message) {
        super(game, message);
        for (const [i, emoji] of this.game.dice.entries()) {
            this.setButton({
                emoji: this.game.module.faces[emoji].toString(),
                style: ButtonStyle.Secondary,
                callback: async (interaction) => {
                    await this.callback(interaction, i);
                }
            });
        }
    }

    protected filter(interaction: MessageComponentInteraction, handler: ComponentHandler): boolean {
        this.game.players[interaction.user.id] ??= new YamJamPlayer(this.game, interaction.user);
        return super.filter(interaction, handler);
    }

    @Button({ row: 1, label: "Voir sa fiche", style: ButtonStyle.Primary, pausable: false })
    public async ingredient(interaction: ButtonInteraction) {
        const player = this.game.players[interaction.user.id];
        await player.sendSheet(interaction);
    }

    public async callback(interaction: MessageComponentInteraction, index: number) {
        if (this.game.paused) {
            return interaction.reply({ content: 'Le jeu est en pause', flags: MessageFlags.Ephemeral });
        }
        if (this.game.lastPlayed === interaction.user.id) {
            return interaction.reply({ content: 'Veuillez attendre q\'un autre joueur prenne un dé', flags: MessageFlags.Ephemeral });
        }

        this.game.lastPlayed = interaction.user.id;
        this.game.lastTimestamp = Date.now();

        for (const p of Object.values(this.game.players)) p.pointsGained = 0;
        this.game.players[interaction.user.id].takeNumber(index);

        this.game.resetTimeout();
        await this.game.sendMessage();
        await this.game.save();
        await interaction.deferUpdate();
    }
}