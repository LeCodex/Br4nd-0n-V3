import { ApplicationCommandOptionType, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { BotCommand, BotModule } from "./base";

export default class Random extends BotModule {
    name: string = "Random";
    description: string = "Multiple random generators";
    color: number = 0xff6600;
    ready: boolean = true;
    dmPermission: boolean = true;

    constructor() {
        super("random");
    }

    public async reply(interaction: ChatInputCommandInteraction, content: string) {
        await interaction.reply({
            embeds: [{
                description: content,
                color: this.color
            }]
        });
    }

    @BotCommand({
        subcommand: "die", description: "Rolls a die", options: [
            { name: "sides", description: "Number of sides", type: ApplicationCommandOptionType.Integer, minValue: 1 }
        ]
    })
    public async die(interaction: ChatInputCommandInteraction) {
        const sides = Number(interaction.options.get("sides")?.value ?? 6);
        await this.reply(interaction, `🎲 The D${sides} landed on **${Math.floor(Math.random() * sides + 1)}**`);
    }

    @BotCommand({
        subcommand: "choice", description: "Picks one of the choices", options: [
            { name: "choices", description: "Choices, separated by commas", type: ApplicationCommandOptionType.String, required: true }
        ]
    })
    public async choice(interaction: ChatInputCommandInteraction) {
        const choices = interaction.options.get("choices")?.value?.toString().split(",").map((e) => e.trim());
        if (!choices || choices.length < 1) return interaction.reply({ content: "Please supply choices", flags: MessageFlags.Ephemeral });
        this.reply(interaction, `🔮 I choose **${choices[Math.floor(Math.random() * choices.length)]}**!`);
    }

    @BotCommand({ subcommand: "rps", description: "Plays Rock Paper Scissors" })
    @BotCommand({ subcommand: "shifumi", description: "Plays Shifumi" })
    public async rps(interaction: ChatInputCommandInteraction) {
        const throws = [":rock: Rock", "📄 Paper", "✂️ Scissors"];
        this.reply(interaction, `✊ I throw **${throws[Math.floor(Math.random() * throws.length)]}**!`);
    }

    @BotCommand({
        subcommand: "card", description: "Draws one or more cards", options: [
            { name: "number", description: "Number of cards to draw", type: ApplicationCommandOptionType.Integer, minValue: 1 },
            { name: "unique", description: "Are the cards draw unique or not?", type: ApplicationCommandOptionType.Boolean },
        ]
    })
    public async card(interaction: ChatInputCommandInteraction) {
        const amount = Number(interaction.options.get("number")?.value ?? 1);
        const unique = interaction.options.get("unique")?.value ?? false;

        const suits = ["❤️", "☘️", "♠️", "🔷"];
        let result: string[] = [];

        for (var i = 0; i < Math.min(unique ? 52 : 100, amount); i++) {
            let card;
            do {
                const value = Math.floor(Math.random() * 13) + 1;
                const display = value < 10 ? String(value + 1) : "AJKQ"[value - 10];
                card = "**" + display + "** " + suits[Math.floor(Math.random() * 4)]
            } while (result.includes(card) && unique);
            result.push(card);
        }

        this.reply(interaction, `🃏 Card(s) drawn: ${result.join(", ")}`);
    }

    @BotCommand({ subcommand: "8ball", description: "Shakes the 8-ball" })
    public async eightBall(interaction: ChatInputCommandInteraction) {
        const answers = [
            "It is certain.",
            "It is decidedly so.",
            "Without a doubt.",
            "Yes – definitely.",
            "You may rely on it.",

            "As I see it, yes.",
            "Most likely.",
            "Outlook good.",
            "Yes.",
            "Signs point to yes.",

            "Reply hazy, try again.",
            "Ask again later.",
            "Better not tell you now.",
            "Cannot predict now.",
            "Concentrate and ask again.",

            "Don't count on it.",
            "My reply is no.",
            "My sources say no.",
            "Outlook not so good.",
            "Very doubtful."
        ];
        this.reply(interaction, `🎱 ${answers[Math.floor(Math.random() * answers.length)]}`);
    }
}