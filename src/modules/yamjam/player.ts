import { EmbedBuilder, MessageFlags, RepliableInteraction, User } from "discord.js";
import YamJamGame from "./game";
import { client } from "client";
import YamJam from ".";

export default class YamJamPlayer {
    tray: number[] = [];
    oldTray: number[] = [];
    points: Record<string, number> = {};
    score: number = 0;
    pointsGained: number = 0;

    constructor(public game: YamJamGame, public user: User) { }

    takeNumber(index: number) {
        this.tray.push(this.game.dice[index]!);
        this.game.dice[index] = Math.floor(Math.random() * 6);

        if (this.tray.length === 5) {
            let max_score = 0;
            let category = "";
            for (const [c, o] of Object.entries(this.game.scoreCategories)) {
                const new_score = o.count(this) - (this.points[c] ? this.points[c] : 0);
                if (new_score > max_score) {
                    max_score = new_score;
                    category = c;
                }
            }

            this.oldTray = [...this.tray];
            this.tray = [];
            if (max_score > 0) this.gainPoints(max_score, category);
        }
    }

    gainPoints(amount: number, category: string) {
        const old_score = this.points[category] ? this.points[category] : 0;
        this.points[category] = old_score + amount;

        this.pointsGained = amount;
        this.score += this.pointsGained;
    }

    async sendSheet(interaction: RepliableInteraction) {
        const embed = new EmbedBuilder()
            .setTitle("Score et catégories | Total: " + this.score + (this.oldTray.length ? " | Dernière combinaison: " + this.oldTray.map(e => this.game.module.faces[e]).join("") : ""))
            .setDescription("```\n" + Object.keys(this.game.scoreCategories).map(e => this.game.scoreCategories[e]!.name + ": " + (this.points[e] ? this.points[e] : 0)).join("\n") + "```")
            .setColor(this.game.module.color);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    serialize() {
        return {
            score: this.score,
            user: this.user.id,
            tray: this.tray,
            oldTray: this.oldTray,
            points: this.points,
            pointsGained: this.pointsGained
        };
    }

    static async load(game: YamJamGame, obj: ReturnType<YamJamPlayer["serialize"]>) {
        const instance = new this(game, await client.users.fetch(obj.user));
        instance.score = obj.score;
        instance.tray = obj.tray;
        instance.oldTray = obj.oldTray;
        instance.points = obj.points;
        instance.pointsGained = obj.pointsGained;
        return instance;
    }
}
