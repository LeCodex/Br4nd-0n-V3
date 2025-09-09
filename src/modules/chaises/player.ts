import { ChatInputCommandInteraction, MessageFlags, User } from "discord.js";
import ChaisesGame from "./game";
import { client } from "client";
import { randomlyPick, COLORED_SQUARES, replyOrFollowUp } from "utils";

export default class ChaisesPlayer {
    score = 0;
    emoji = "";

    constructor(
        public game: ChaisesGame,
        public user: User,
    ) {
        this.emoji = randomlyPick(COLORED_SQUARES);
    }

    get chairs() {
        return this.game.chairs.filter(e => e === this.user.id).length;
    }

    async rollDice(interaction: ChatInputCommandInteraction) {
        if (this.game.previousPlayers.includes(this.user.id)) {
            return interaction.reply({ content: "Veuillez attendre que les autres joueurs jouent", flags: MessageFlags.Ephemeral });
        }

        const result = Math.floor(Math.random() * this.game.chairs.length);
        const successful = this.game.markChair(result, this);
        const suffix = successful ? `${this.chairs} chaise${this.chairs > 1 ? "s" : ""} au total` : `🧂`;
        await this.game.boardMessage?.delete();
        await this.game.sendBoardAndSave({ interaction, title: `Lancer de ${this.user.displayName}`, message: `${this} a lancé un ${result + 1}! (${suffix})` });
        await replyOrFollowUp(interaction, { content: successful ? `Vous vous êtes assis sur la chaise n°${result + 1}` : `Vous avez perdu toutes vos chaises!`, flags: MessageFlags.Ephemeral });
        // Force the message to not be edited
        if (!successful) delete this.game.boardMessage;
    }

    toString() {
        return this.user.toString();
    }

    serialize() {
        return {
            user: this.user.id,
            score: this.score,
            emoji: this.emoji
        };
    }

    static async load(game: ChaisesGame, obj: ReturnType<ChaisesPlayer["serialize"]>) {
        const instance = new this(game, await client.users.fetch(obj.user));
        instance.score = obj.score;
        if (obj.emoji) instance.emoji = obj.emoji;
        return instance;
    }
}
