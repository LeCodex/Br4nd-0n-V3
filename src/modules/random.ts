import { ApplicationCommandOptionType, CommandInteraction } from "discord.js";
import { BotCommand, BotModule } from "./base";

export default class Random extends BotModule {
    name: string = "Random";
    description: string = "Multiple random generators";
    commandName: string = "random";
    color: number = 0xff6600;
    ready: boolean = true;
    dmPermission: boolean = true;

    async reply(interaction: CommandInteraction, content: string) {
        await interaction.reply({
            embeds: [{
                description: content,
                color: this.color
            }]
        });
    }

    @BotCommand({
        subcommand: "die", description: "Roll a die", options: [
            { name: "sides", description: "Number of sides", type: ApplicationCommandOptionType.Integer, minValue: 1 }
        ]
    })
    async die(interaction: CommandInteraction) {
        const sides = Number(interaction.options.get("sides")?.value ?? 6);
        await this.reply(interaction, `🎲 The D${sides} landed on **${Math.floor(Math.random() * sides + 1)}**`);
    }

    @BotCommand({
        subcommand: "choice", description: "Picks one of the choices", options: [
            { name: "choices", description: "Choices, separated by commas", type: ApplicationCommandOptionType.String, required: true }
        ]
    })
    async choice(interaction: CommandInteraction) {
        const choices = interaction.options.get("choices")?.value?.toString().split(",").map((e) => e.trim());
        if (!choices) return await interaction.reply({ content: "Please supply choices", flags: "Ephemeral" });
        this.reply(interaction, `🔮 I choose **${choices[Math.floor(Math.random() * choices.length)]}**!`);
    }

    @BotCommand({ subcommand: "rps", description: "Plays Rock Paper Scissors" })
    @BotCommand({ subcommand: "shifumi", description: "Plays Rock Paper Scissors" })
    async rps(interaction: CommandInteraction) {
        const throws = [":rock: Rock", "📄 Paper", "✂️ Scissors"];
        this.reply(interaction, `✊ I throw **${throws[Math.floor(Math.random() * throws.length)]}**!`);
    }

    @BotCommand({
        subcommand: "card", description: "Draws one or more cards", options: [
            { name: "number", description: "Number of cards to draw", type: ApplicationCommandOptionType.Integer, minValue: 1 },
            { name: "unique", description: "Are the cards draw unique or not?", type: ApplicationCommandOptionType.Boolean },
        ]
    })
    async card(interaction: CommandInteraction) {
        const amount = Number(interaction.options.get("number")?.value ?? 1);
        const unique = interaction.options.get("unique")?.value ?? false;

        const suits = ["❤️", "☘️", "♠️", "🔷"];
        let result: string[] = [];

        for (var i = 0; i < Math.min(unique ? 52 : 100, amount); i ++) {
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

    @BotCommand({ subcommand: "8ball", description: "Shake the 8-ball" })
    async eightBall(interaction: CommandInteraction) {
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