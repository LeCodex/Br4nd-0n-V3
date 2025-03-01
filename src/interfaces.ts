import { ChatInputApplicationCommandData, CommandInteraction } from "discord.js";

export interface BotCommandMetadata extends ChatInputApplicationCommandData {
    method: symbol | string
}

export interface BotCommand extends ChatInputApplicationCommandData {
    run: (interaction: CommandInteraction) => Promise<void>;
}

export type Concrete<T extends abstract new (...args: any[]) => any> = T extends abstract new (...args: infer U) => infer V ? new (...args: U) => V : never;