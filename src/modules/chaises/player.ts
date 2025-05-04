import { ChatInputCommandInteraction, MessageFlags, User } from "discord.js";
import ChaisesGame from "./game";
import { client } from "client";

export default class ChaisesPlayer {
    score = 0;

    constructor(
        public game: ChaisesGame,
        public user: User,
    ) { }

    async rollDice(interaction: ChatInputCommandInteraction) {
        if (this.game.previousPlayers.includes(this.user.id)) {
            await interaction.reply({ content: "Veuillez attendre que les autres joueurs jouent", flags: MessageFlags.Ephemeral });
            return;
        }

        const result = Math.floor(Math.random() * this.game.chairs.length);
        const chairs = this.game.chairs.filter(e => e === this.user.id).length + 1;
        await interaction.reply(`${this} a lancé un ${result+1}! (${chairs} chaise${chairs > 1 ? "s" : ""} au total)`);
        await this.game.markChair(result, this);
    }

    toString() {
        return this.user.username;
    }

    serialize() {
        return {
            user: this.user.id,
            score: this.score
        };
    }

    static async load(game: ChaisesGame, obj: ReturnType<ChaisesPlayer["serialize"]>) {
        const instance = new this(game, await client.users.fetch(obj.user));
        instance.score = obj.score;
        return instance;
    }
}
