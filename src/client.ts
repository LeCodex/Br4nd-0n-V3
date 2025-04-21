import { Client, IntentsBitField } from "discord.js";

export const client = new Client({
    intents: [
        IntentsBitField.Flags.GuildExpressions,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.DirectMessages,
    ]
});
