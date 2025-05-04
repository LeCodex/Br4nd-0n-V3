import { Game } from "modules/game";
import Fruit from "./fruits";
import CoupdjusPlayer from "./player";
import { ChatInputCommandInteraction, EmbedBuilder, MessageComponentInteraction, MessageFlags } from "discord.js";
import { DateTime } from "luxon";
import { getRankEmoji, NUMBER_EMOJIS } from "utils";
import CoupdjusView from "./view";
import Coupdjus from ".";

export default class CoupdjusGame extends Game {
    players: Record<string, CoupdjusPlayer> = {};
    lastPlayed = "";
    title = "";
    summary = "";
    blenders: Array<Array<Fruit>> = [[], [], [], [], [], []];
    timeout?: NodeJS.Timeout;
    nextTimestamp?: DateTime;
    waitDuration = {
        minutes: 30,
        hours: 0
    };
    maxActions = 3;
    view?: CoupdjusView

    constructor(module: Coupdjus, channelId: string) {
        super(module, channelId);
    }

    async start(interaction: ChatInputCommandInteraction) {
        await this.sendInfoAndSave();
        this.setupTimeout();
        await interaction.reply({ content: "Started", flags: MessageFlags.Ephemeral });
    }

    setupTimeout(newTurn = true) {
        clearTimeout(this.timeout);
        const now = DateTime.local();
        if (newTurn) {
            if (!this.nextTimestamp) this.nextTimestamp = DateTime.local();
            this.nextTimestamp = this.nextTimestamp.plus(this.waitDuration).set({ second: 0, millisecond: 0 });
            if (!this.waitDuration.minutes) this.nextTimestamp = this.nextTimestamp.set({ minute: 0 });
        }
        const time = this.nextTimestamp!.toMillis() - now.toMillis();

        // console.log(this.nextTimestamp, now, this.waitDuration, time);
        this.timeout = setTimeout(() => { this.recharge(); }, time);
    }

    async tryAndPlayFruit(interaction: MessageComponentInteraction, index: number) {
        const player = this.players[interaction.user.id] ??= new CoupdjusPlayer(this, interaction.user);
        if (player.actions == 0) {
            await interaction.reply({ content: "Vous n'avez plus d'actions, veuillez attendre", flags: MessageFlags.Ephemeral });
        } else if (index < 0 || index >= this.blenders.length) {
            await interaction.reply({ content: "Veuillez renseigner un index présent sous un des mixeurs", flags: MessageFlags.Ephemeral });
        } else if (this.blenders[index].some(e => e.player === player)) {
            await interaction.reply({ content: "Vous avez déjà joué dans ce mixeur", flags: MessageFlags.Ephemeral });
        } else {
            this.summary = "";
            await player.playFruit(index);
            await interaction.deferUpdate();
        }
    }

    async sendInfoAndSave(message = "", summary = "", edit = true, resend = false) {
        const sorted = Object.values(this.players).sort((a, b) => b.score - a.score);
        this.title = message.length ? message : this.title;
        this.summary = summary.length ? summary : this.summary;

        const rows = [];
        for (let i = 0; i < this.blenders.length; i ++) {
            const blender = this.blenders[i];
            let row = NUMBER_EMOJIS[i] + "🍶⬛";

            for (let j = 0; j < 3; j++)
                row += blender.length > j ? blender[j].emoji : "⬛";

            row += " - ";
            row += blender.map(e => e.player.user.toString()).join(", ");

            rows.push(row);
        }

        const embed = new EmbedBuilder()
            .setTitle("[COUP D'JUS] " + this.title)
            .addFields({
                name: "Mixeurs",
                value: rows.join("\n")
            })
            .setColor(this.module.color);

        if (sorted.length)
            embed.addFields({
                name: "Cuisiniers",
                value: sorted.reduce((buffer, e) => {
                    if (e.score < buffer.lastScore) {
                        buffer.lastScore = e.score;
                        buffer.rank++;
                    }
                    buffer.message += `${getRankEmoji(buffer.rank)} **${buffer.rank + 1}.** ${e.user ? e.user.toString() : "Joueur non trouvé"}: `
                        + `${e.fruit.emoji} (**${e.score} pts**, ${e.actions}/${this.maxActions})\n`;
                    return buffer;
                }, {message: "", rank: -1, lastScore: Infinity}).message
            })

        if (this.summary.length)
            embed.addFields({ name: "Résumé", value: this.summary });

        if (this.view) {
            if (edit) {
                await this.view.edit({ embeds: [embed] });
            } else {
                await this.view.resend({ embeds: [embed] }, resend);
            }
        } else if (this.channel) {
            this.view = await new CoupdjusView(this).send(this.channel, { embeds: [embed] });
        }

        await this.save();
    }

    async nextTurn(player: CoupdjusPlayer, message: string) {
        const summary = [];
        const gains: Record<string, number> = {}
        for (const blender of this.blenders) {
            if (blender.length >= 3) {
                gains[blender[0].player.user.id] = (gains[blender[0].player.user.id] ?? 0) + 1;
                gains[blender[1].player.user.id] = (gains[blender[1].player.user.id] ?? 0) + 1;

                const recipe = blender.map(e => e.emoji).join("");
                summary.push(`La recette ${recipe} a été complétée!`);

                let used = false;
                for (const player of Object.values(this.players)) {
                    if (player.recipes.includes(recipe)) {
                        gains[blender[2].player.user.id] = (gains[blender[2].player.user.id] ?? 0) + 1;
                        gains[player.user.id] = (gains[player.user.id] ?? 0) + 1;
                        used = true;
                        summary.push(`${player.user.toString()} a cette recette!`);
                    }
                }

                if (!used) {
                    player.recipes.unshift(recipe);
                    if (player.recipes.length > 4) player.recipes.pop();
                    summary.push(`Personne ne l'avait, donc ${player.user.toString()} l'a récupérée`);
                }

                blender.length = 0;
            }
        }

        for (const id of Object.keys(gains)) {
            const ply = this.players[id]
            ply.score += gains[id];
            summary.push(`${ply.user.toString()} a gagné ${gains[id]}  ${gains[id] > 1 ? "points" : "point"}`)
        }

        this.lastPlayed = player.user.id;
        player.giveNewFruit();
        await this.sendInfoAndSave(message, summary.join("\n"));
    }

    async recharge() {
        for (const player of Object.values(this.players)) {
            player.actions = this.maxActions;
        }

        this.setupTimeout(true);
        await this.sendInfoAndSave("🔄 Recharge des actions", undefined, false);
    }

    protected serialize() {
        return {
            ...super.serialize(),
            players: Object.fromEntries(Object.entries(this.players).map(([k, v]) => [k, v.serialize()])),
            lastPlayed: this.lastPlayed,
            title: this.title,
            summary: this.summary,
            blenders: this.blenders.map((e) => e.map((f) => f.serialize())),
            nextTimestamp: this.nextTimestamp?.toMillis(),
            waitDuration: this.waitDuration,
            maxActions: this.maxActions,
            view: this.view?.serialize()
        }
    }

    static async load(module: Coupdjus, channelId: string, obj: ReturnType<CoupdjusGame["serialize"]>) {
        const instance = new this(module, channelId);
        instance.players = Object.fromEntries(await Promise.all(Object.entries(obj.players).map(async ([k, v]) => [k, await CoupdjusPlayer.load(instance, v)])));
        instance.lastPlayed = obj.lastPlayed;
        instance.title = obj.title;
        instance.summary = obj.summary;
        instance.blenders = obj.blenders.map((e) => e.map((f) => Fruit.load(instance.players[f.player], f)));
        if (obj.nextTimestamp) instance.nextTimestamp = DateTime.fromMillis(obj.nextTimestamp);
        instance.waitDuration = obj.waitDuration;
        instance.maxActions = obj.maxActions;
        if (obj.view) instance.view = new CoupdjusView(instance, await CoupdjusView.load(obj.view));
        instance.setupTimeout();
        await instance.sendInfoAndSave();
        return instance;
    }
}
