import { ApplicationCommandOptionData, ApplicationCommandOptionType, ApplicationCommandType, ChatInputApplicationCommandData } from "discord.js";
import { configDotenv } from "dotenv";
import { modules } from "src/modules";
import { BotCommand } from "src/interfaces";
import Logger from "src/logger";
import ErrorHandler from "src/errors";
import AdminPanel from "src/admin";
import View from "src/view";
import { client } from "src/client";
import { BotModule } from "src/modules/base";

configDotenv();

Logger.log("Bot is starting...");

const allCommands: BotCommand[] = [];
const moduleInstances: BotModule[] = [];

client.on("ready", async () => {
    if (!client.user || !client.application) {
        Logger.error(`Bot failed to connect`);
        return;
    }

    ErrorHandler.load(client);
    AdminPanel.load(client);

    const groupedCommands: ChatInputApplicationCommandData[] = [];
    for (const module of modules) {
        const instance = new module(client);
        allCommands.push(...instance.commands);

        const subcommandsCount = instance.commands.filter((e) => e.subcommand).length;
        if (subcommandsCount < instance.commands.length && subcommandsCount > 0) {
            throw TypeError(`Module ${instance.name} has both subcommands and a command, which isn't supported`);
        }

        if (subcommandsCount === 0) {
            groupedCommands.push({
                name: instance.commandName,
                ...instance.commands[0],
                type: ApplicationCommandType.ChatInput
            });
        } else {
            const groupsWithSubcommands = new Map<string | undefined, BotCommand[]>();
            for (const command of instance.commands) {
                if (!groupsWithSubcommands.get(command.subcommandGroup)) groupsWithSubcommands.set(command.subcommandGroup, []);
                groupsWithSubcommands.get(command.subcommandGroup)!.push(command);
            }
    
            groupedCommands.push({
                name: instance.commandName,
                description: instance.description,
                type: ApplicationCommandType.ChatInput,
                options: [...groupsWithSubcommands.entries()].flatMap<ApplicationCommandOptionData>(([subcommandGroup, subcommands]) => subcommandGroup ? {
                    name: subcommandGroup,
                    description: "",
                    type: ApplicationCommandOptionType.SubcommandGroup,
                    options: subcommands.map((e) => ({
                        name: e.subcommand!,
                        ...e,
                        type: ApplicationCommandOptionType.Subcommand,
                    })),
                } : subcommands.map((e) => ({
                    name: e.subcommand!,
                    ...e,
                    type: ApplicationCommandOptionType.Subcommand,
                })))
            });
        }

        Logger.log(`Loaded module ${instance.name} (${instance.description}) with ${instance.commands.length} commands`);
        instance.onLoaded();
    }

    client.application.commands.set(groupedCommands);
    Logger.log(`${client.user.username} is online`);
});

client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            for (const command of allCommands) {
                const subcommandGroup = interaction.options.getSubcommandGroup(false);
                const subcommand = interaction.options.getSubcommand(false);
                if (
                    command.module.commandName === interaction.commandName &&
                    subcommandGroup === (command.subcommandGroup ?? null) &&
                    subcommand === (command.subcommand ?? null)
                ) {
                    const concatenatedCommand = interaction.commandName + (subcommandGroup ? ` ${subcommandGroup}` : "") + (subcommand ? ` ${subcommand}` : "");
                    Logger.log(`Running command "${concatenatedCommand}" with options ${JSON.stringify(Object.fromEntries(interaction.options.data.map(e => [e.name, e.value])))}`);
                    await command.callback(interaction);
                }
            }
        } else if (interaction.isMessageComponent()) {
            for (const [messageId, view] of View.index) {
                if (messageId === interaction.message.id) {
                    await view.handle(interaction);
                }
            }
        }
    } catch (e) {
        await ErrorHandler.handle(client, interaction, e);
    }
});

client.on("messageCreate", async (message) => {
    for (const module of moduleInstances) {
        module.onMessage(message);
    }
});

process.on('uncaughtException', async (err) => {
    await ErrorHandler.handle(client, undefined, err);
});
  
process.on('unhandledRejection', async (err) => {
    await ErrorHandler.handle(client, undefined, err);
});

client.login(process.env.BOT_TOKEN);
