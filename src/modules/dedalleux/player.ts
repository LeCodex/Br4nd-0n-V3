import { EmbedBuilder, MessageFlags, RepliableInteraction, User } from "discord.js";
import DedalleuxGame from "./game";
import Dedalleux from ".";
import { client } from "client";

export default class DedalleuxPlayer {
    score: number = 0;
    item: number;
    turnedOnce: boolean = false;
    gainedOnePoint: boolean = false;

    constructor(public game: DedalleuxGame, public user: User) {
        this.item = Math.floor(Math.random() * this.game.availableItems.length);
    }

    gainPoints(amount: number) {
        this.gainedOnePoint = true;
        let newItem;
        do {
            newItem = Math.floor(Math.random() * this.game.availableItems.length);
        } while (newItem === this.item);
        this.score += amount;
        this.item = newItem;
    }

    async sendItem(interaction: RepliableInteraction) {
        var embed = new EmbedBuilder()
            .setTitle("Ingrédient à récupérer: " + this.game.items[this.item].item)
            .setColor(this.game.module.color);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    serialize() {
        return {
            score: this.score,
            user: this.user.id,
            turnedOnce: this.turnedOnce,
            item: this.item,
            gainedOnePoint: this.gainedOnePoint
        };
    }

    static async load(module: Dedalleux, game: DedalleuxGame, obj: Record<string, any>) {
        const instance = new this(game, await client.users.fetch(obj.user));
        instance.score = obj.score;
        instance.turnedOnce = obj.turnedOnce;
        instance.item = obj.item;
        instance.gainedOnePoint = obj.gainedOnePoint;
        return instance;
    }
}
