import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, User } from "discord.js";
import CoupdjusGame from "./game";
import Fruit from "./fruits";
import { randomlyPick } from "utils";
import { client } from "client";

export default class CoupdjusPlayer {
    score = 0;
    fruit!: Fruit;
    recipes: string[] = [];
    actions: number;

    constructor(public game: CoupdjusGame, public user: User) {
        this.actions = game.maxActions;
        this.giveNewFruit();
    }

    async playFruit(index: number) {
        this.actions--;
        this.game.blenders[index].push(this.fruit);
        this.fruit.effect();
    }

    async sendInfo(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setDescription("Fruit: " + this.fruit.fullName + (this.recipes.length ? "\n\nRecettes:\n • " + this.recipes.join("\n • ") : ""))
            .setColor(this.game.module.color);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    giveNewFruit() {
        this.fruit = new Fruit(this, randomlyPick(Object.keys(Fruit.data)));
    }

    serialize() {
        return {
            user: this.user.id,
            score: this.score,
            fruit: this.fruit.serialize(),
            recipes: this.recipes,
            actions: this.actions
        }
    }

    static async load(game: CoupdjusGame, obj: ReturnType<CoupdjusPlayer["serialize"]>) {
        const instance = new this(game, await client.users.fetch(obj.user));
        instance.score = obj.score;
        instance.fruit = Fruit.load(instance, obj.fruit);
        instance.recipes = obj.recipes;
        instance.actions = obj.actions;
        return instance;
    }
}
