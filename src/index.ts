import { Client, InteractionType } from "discord.js";
import { configDotenv } from "dotenv";
import { modules } from "./modules";
import { BotCommand } from "./interfaces";
import Logger from "./logger";

configDotenv()

Logger.log("Bot is starting...");

const client = new Client({
    intents: []
});
const allCommands: BotCommand[] = [];

client.on("ready", async () => {
    if (!client.user || !client.application) {
        Logger.error(`Bot failed to load`);
        return;
    }

    for (const module of modules) {
        const instance = new module(client);
        allCommands.push(...instance.commands);
        Logger.log(`Loaded module ${instance.name} (${instance.description}) with ${instance.commands.length} commands`)
    }
    client.application.commands.set(allCommands);

    Logger.log(`${client.user.username} is online`);
});

client.on("interactionCreate", async (interaction) => {
    if (interaction.isCommand()) {
        for (const command of allCommands) {
            if (command.name === interaction.commandName) {
                await command.run(interaction);
            }
        }
    }
});

client.login(process.env.BOT_TOKEN);
