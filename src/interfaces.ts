import { ApplicationCommandOptionData, ApplicationCommandSubCommandData, ApplicationCommandSubGroupData, ChatInputApplicationCommandData, CommandInteraction } from "discord.js";
import { BotModule } from "./modules/base";

export interface ChatInputAplicationSubcommandData extends Omit<ChatInputApplicationCommandData, "name" | "options" | "type"> {
    subcommand?: string;
    subcommandGroup?: string;
    options?: readonly Exclude<
        ApplicationCommandOptionData,
        ApplicationCommandSubGroupData | ApplicationCommandSubCommandData
    >[];
}

export interface BotSubcommandMetadata extends ChatInputAplicationSubcommandData {
    method: symbol | string;
}

export interface BotCommand extends ChatInputAplicationSubcommandData {
    module: BotModule;
    run: (interaction: CommandInteraction) => Promise<void>;
}

export type Concrete<T extends abstract new (...args: any[]) => any> = T extends abstract new (...args: infer U) => infer V ? new (...args: U) => V : never;