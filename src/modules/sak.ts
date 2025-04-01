import DB from "db";
import { AdminCommand, BotCommand, BotModule } from "./base"
import Logger from "logger";
import { ApplicationCommandOptionType, ApplicationCommandUserOption, ChatInputCommandInteraction, EmbedBuilder, Emoji, MessageFlags, PermissionFlagsBits, User } from "discord.js";
import { times } from "lodash";
import { createRankEmbed, getEmoji } from "utils";
import { client } from "client";

export default class Sakatasses extends BotModule {
    public name: string = "Sakatasses";
    public description: string = "Compte des tasses comme un businessman compte les étoiles";
    public color: number = 0xffff66;

    private sak: Record<string, Record<string, number>> = {};
    private cupEmoji: string | Emoji = "☕";

    constructor() {
        super("sak");
    }

    public async onLoaded() {
        const records = await DB.getRecords(this.commandName);
        for (const serverId of records) {
            const data = await DB.get<{}>(this.commandName, serverId);
            if (!data) continue;
            Logger.log(`Loading sak of server ${serverId}`);
            this.sak[serverId] = data;
        }
        this.cupEmoji = await getEmoji("tasse", "☕");
        this.ready = true;
    }

    private checkExistence(serverId: string) {
        if (!this.sak[serverId]) {
            this.sak[serverId] = {}
        }
    }

    @BotCommand({ description: "Voir son sakatasse" })
    public async info(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            return interaction.reply({ content: "Not in a guild", flags: MessageFlags.Ephemeral });
        }
        this.checkExistence(interaction.guildId);
        const sak = this.sak[interaction.guildId][interaction.user.id] ??= 0;
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`**Sakatasse**: **${sak}** ${this.cupEmoji}`)
                    .setColor(this.color)
            ],
            flags: MessageFlags.Ephemeral
        });
    }

    @AdminCommand({ subcommand: "rank", description: "Voir le classement" })
    public async rank(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            return interaction.reply({ content: "Not in a guild", flags: MessageFlags.Ephemeral });
        }
        this.checkExistence(interaction.guildId);
        return interaction.reply({
            embeds: [
                createRankEmbed(
                    {
                        title: "🏆 Classement",
                        color: this.color
                    },
                    "Utilisateurs",
                    await Promise.all(
                        Object.entries(this.sak[interaction.guildId]).map(async ([userId, amount]) => ({ user: await client.users.fetch(userId), score: [amount] }))
                    ),
                    "Tasses",
                    this.cupEmoji
                )
            ],
            flags: MessageFlags.Ephemeral
        });
    }

    @AdminCommand({
        subcommand: "add", description: "Donne des tasses", options: [
            { required: true, name: "amount", description: "La quantité de tasses", type: ApplicationCommandOptionType.Integer },
            ...times<ApplicationCommandUserOption>(24, (i) => ({ name: `user${i + 1}`, description: "Un utilisateur", type: ApplicationCommandOptionType.User }))
        ]
     })
    public async add(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) {
            return interaction.reply({ content: "Not in a guild", flags: MessageFlags.Ephemeral });
        }
        const amount = Number(interaction.options.get("amount")?.value);
        if (isNaN(amount)) {
            return interaction.reply({ content: "Invalid amount", flags: MessageFlags.Ephemeral });
        }
        
        this.checkExistence(interaction.guildId);
        const users: User[] = []
        for (let i = 0; i < 24; i++) {
            const user = interaction.options.get(`user${i + 1}`)?.user;
            if (!user) continue;
            users.push(user);
            this.sak[interaction.guildId][user.id] ??= 0;
            this.sak[interaction.guildId][user.id] += amount;
        }

        await DB.save(this.commandName, interaction.guildId, this.sak[interaction.guildId]);

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`${this.cupEmoji} Ajout de tasses`)
                    .setDescription(`${users.map((e) => e.toString()).join(", ")} ${users.length > 1 ? "ont" : "a"} ${amount >= 0 ? "gagné" : "perdu"} ${Math.abs(amount)} tasse${amount > 0 ? "s" : ""}!`)
                    .setColor(this.color)
            ]
        });
    }
}