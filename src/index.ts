import { ApplicationCommandOptionData, ApplicationCommandOptionType, ApplicationCommandSubGroupData, ApplicationCommandType, ChatInputApplicationCommandData, InteractionContextType, PermissionFlagsBits } from "discord.js";
import { configDotenv } from "dotenv";
import { modules } from "modules";
import { BotCommand } from "interfaces";
import Logger from "logger";
import ErrorHandler from "errors";
import AdminPanel from "admin";
import View from "view";
import { client } from "client";
import { BotModule } from "modules/base";

configDotenv();

Logger.log("Bot is starting...");

const allCommands: BotCommand[] = [];
const moduleInstances: BotModule[] = [];

client.on("ready", async () => {
    if (!client.user || !client.application) {
        Logger.error(`Bot failed to connect`);
        return;
    }

    await ErrorHandler.load();
    await AdminPanel.load();

    const groupedCommands: Record<string, ChatInputApplicationCommandData[]> = {};
    const adminSubcommands: Record<string, ApplicationCommandSubGroupData[]> = {};
    for (const module of modules) {
        const instance = new module();
        allCommands.push(...instance.commands, ...instance.adminCommands.map((e) => ({ ...e, subcommandGroup: instance.commandName })));

        if (instance.commands.length > 0) {
            const subcommandsCount = instance.commands.filter((e) => e.subcommand).length;
            if (subcommandsCount < instance.commands.length && subcommandsCount > 0) {
                throw TypeError(`Module ${instance.name} has both subcommands and a command, which isn't supported`);
            }

            let commandData: ChatInputApplicationCommandData;
            if (subcommandsCount === 0) {
                commandData = {
                    name: instance.commandName,
                    dmPermission: instance.dmPermission,
                    ...instance.commands[0],
                    type: ApplicationCommandType.ChatInput
                };
            } else {
                const groupsWithSubcommands = new Map<string | undefined, BotCommand[]>();
                for (const command of instance.commands) {
                    if (!groupsWithSubcommands.get(command.subcommandGroup)) groupsWithSubcommands.set(command.subcommandGroup, []);
                    groupsWithSubcommands.get(command.subcommandGroup)!.push(command);
                }
                
                commandData = {
                    name: instance.commandName,
                    description: instance.description,
                    dmPermission: instance.dmPermission,
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
                };
            }

            for (const guildId of instance.guilds) {
                groupedCommands[guildId] ??= [];
                groupedCommands[guildId].push(commandData);
            }
        }

        if (instance.adminCommands.length > 0) {
            let subcommandData: ApplicationCommandSubGroupData = {
                name: instance.commandName,
                description: instance.description,
                type: ApplicationCommandOptionType.SubcommandGroup as const,
                options: instance.adminCommands.map((e) => ({
                    name: e.subcommand!,
                    description: e.description,
                    type: ApplicationCommandOptionType.Subcommand
                }))
            };

            for (const guildId of instance.guilds) {
                adminSubcommands[guildId] ??= [];
                adminSubcommands[guildId].push(subcommandData);
            }
        }

        Logger.log(`Loaded module ${instance.name} (${instance.description}) with ${instance.commands.length} + ${instance.adminCommands.length} commands`);
        await instance.onLoaded();
    }

    for (const [guildId, adminSubcommand] of Object.entries(adminSubcommands)) {
        groupedCommands[guildId] ??= [];
        groupedCommands[guildId].push({
            name: "admin",
            description: `Admin commands${guildId === "" ? "" : " for this guild"}`,
            defaultMemberPermissions: [PermissionFlagsBits.Administrator],
            dmPermission: false,
            contexts: [InteractionContextType.Guild],
            type: ApplicationCommandType.ChatInput,
            options: adminSubcommand
        });
    }

    for (const [guildId, commands] of Object.entries(groupedCommands)) {
        if (guildId === "") {
            await client.application.commands.set(commands);
            Logger.log(`Registered ${commands.length} commands globally`);
        } else {
            await client.application.commands.set(commands, guildId);
            Logger.log(`Registered ${commands.length} commands for guild ${guildId}`);
        }
    }
    Logger.log(`${client.user.displayName} is online`);
});

client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const subcommandGroup = interaction.options.getSubcommandGroup(false);
            const subcommand = interaction.options.getSubcommand(false);
            for (const command of allCommands) {
                const name = command.module?.commandName ?? "admin";
                if (
                    name === interaction.commandName &&
                    subcommandGroup === (command.subcommandGroup ?? null) &&
                    subcommand === (command.subcommand ?? null)
                ) {
                    const concatenatedCommand = interaction.commandName + (subcommandGroup ? ` ${subcommandGroup}` : "") + (subcommand ? ` ${subcommand}` : "");
                    Logger.log(`Running command "${concatenatedCommand}" with options ${JSON.stringify(Object.fromEntries(interaction.options.data.map(e => [e.name, e.value])))}`);
                    await command.callback(interaction);
                    break;
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
        await ErrorHandler.handle(interaction, e);
    }
});

client.on("messageCreate", async (message) => {
    for (const module of moduleInstances) {
        module.onMessage(message);
    }
});

process.on('uncaughtException', async (err) => {
    await ErrorHandler.handle(undefined, err);
});
  
process.on('unhandledRejection', async (err) => {
    await ErrorHandler.handle(undefined, err);
});

client.login(process.env.BOT_TOKEN);
