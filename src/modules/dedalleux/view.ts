import { ButtonInteraction, ButtonStyle, Message, MessageComponentInteraction, MessageFlags } from "discord.js";
import { Button } from "view";
import DedalleuxGame from "./game";
import { DateTime } from "luxon";
import DedalleuxPlayer from "./player";
import GameView from "modules/game/view";
import { ComponentHandler } from "interfaces";

export default class DedalleuxView extends GameView<DedalleuxGame> {
    constructor(game: DedalleuxGame, message?: Message) {
        super(game, message);
        for (const [i, emoji] of this.game.colors.slice(5).entries()) {
            this.setButton({
                emoji: emoji.toString(),
                style: ButtonStyle.Secondary,
                callback: async (interaction) => {
                    await this.callback(interaction, i);
                },
            });
        }
    }

    protected filter(interaction: MessageComponentInteraction, handler: ComponentHandler): boolean {
        this.game.players[interaction.user.id] ??= new DedalleuxPlayer(this.game, interaction.user);
        return super.filter(interaction, handler);
    }

    @Button({ row: 1, label: "Voir son ingrédient", style: ButtonStyle.Primary, pausable: false })
    public async ingredient(interaction: ButtonInteraction) {
        const player = this.game.players[interaction.user.id]!;
        await player.sendItem(interaction);
    }

    public async callback(interaction: MessageComponentInteraction, index: number) {
        const now = DateTime.local();
        if ((this.game.nextTimestamp ?? now).toSeconds() - now.toSeconds() <= 30) {
            return interaction.deferUpdate();
        };

        const player = this.game.players[interaction.user.id]!;
        if (player.turnedOnce) {
            return interaction.reply({ content: "Vous avez déjà tourné les murs ce tour", flags: MessageFlags.Ephemeral });
        }

        player.turnedOnce = true;
        let moved = true;
        const turned: number[] = [];
        while (moved) {
            moved = false;
            for (const [i, element] of this.game.walls.entries()) {
                if (element.color === index) {
                    let newDir = (element.direction + (this.game.clockwiseRotation ? 1 : -1) + 4) % 4;
                    let d = [1, 0, -1, 0][newDir]! + this.game.colors.length / 2 * [0, 1, 0, -1][newDir]!;

                    let shouldTurn = true;
                    if (
                        // If we have a neighbor that's in the board,
                        i + d >= 0 && i + d < this.game.walls.length && 
                        // and we aren't checking left of the first wall of each line,
                        !(d === -1 && i % (this.game.colors.length / 2) === 0) && 
                        // or right of the last,
                        !(d === 1 && (i + 1) % (this.game.colors.length / 2) === 0) &&
                        // and that neighbor occupies that spot
                        (this.game.walls[i + d]!.direction + 2) % 4 === newDir
                    ) {
                        shouldTurn = false;
                    }

                    if (shouldTurn && !turned.includes(i)) {
                        turned.push(i);
                        element.direction = newDir;
                        moved = true;
                    }
                }
            }
        }

        this.game.generateBoard();
        this.game.generatePath();
        await this.game.sendBoard();
        await this.game.save();
        await interaction.deferUpdate();
    }
}