import { ApplicationCommandOptionData, ApplicationCommandSubCommandData, ApplicationCommandSubGroupData, ButtonBuilder, ChannelSelectMenuBuilder, ChannelSelectMenuComponentData, ChatInputApplicationCommandData, ChatInputCommandInteraction, InteractionButtonComponentData, MentionableSelectMenuBuilder, MentionableSelectMenuComponentData, MessageComponentInteraction, RoleSelectMenuBuilder, RoleSelectMenuComponentData, StringSelectMenuBuilder, StringSelectMenuComponentData, UserSelectMenuBuilder, UserSelectMenuComponentData } from "discord.js";
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
    callback: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export type Constructor<T, P extends any[] = any> = new (...args: P) => T;
export type Concrete<T extends abstract new (...args: any[]) => any> = T extends abstract new (...args: infer U) => infer V ? new (...args: U) => V : never;

export type ComponentHandlerMetadata<T extends NonLinkButtonMessageActionRowComponentData = NonLinkButtonMessageActionRowComponentData> = T & {
    builder: Constructor<NonTextInputComponentBuilder>;
    method: symbol | string;
    row?: NumberRange<4>;
    index?: NumberRange<4>;
}

export type ComponentHandlerParameter<T extends NonLinkButtonMessageActionRowComponentData> = Omit<ComponentHandlerMetadata<T>, "type" | "customId" | "custom_id" | "method" | "builder">;

export type ComponentHandler<T extends NonLinkButtonMessageActionRowComponentData = NonLinkButtonMessageActionRowComponentData> = ComponentHandlerMetadata<T> & {
    callback: (interaction: MessageComponentInteraction) => Promise<void>;
}

export type NonLinkButtonMessageActionRowComponentData =
    | InteractionButtonComponentData
    | StringSelectMenuComponentData
    | UserSelectMenuComponentData
    | RoleSelectMenuComponentData
    | MentionableSelectMenuComponentData
    | ChannelSelectMenuComponentData;

export type NonTextInputComponentBuilder = 
    | ButtonBuilder
    | StringSelectMenuBuilder
    | UserSelectMenuBuilder
    | StringSelectMenuBuilder
    | ChannelSelectMenuBuilder
    | MentionableSelectMenuBuilder
    | RoleSelectMenuBuilder

export type Fill<Amount extends number, Result extends number[] = []> = Result['length'] extends Amount ? Result : Fill<Amount, [...Result, 0]>; 
export type NumberRange<Min extends number, Max extends number = -1, Current extends number[] = Fill<Max extends -1 ? 0 : Min>> =
    Current['length'] extends (Max extends -1 ? Min : Max) ? Current['length'] : Current['length'] | NumberRange<Min, Max, [...Current, 0]>;
export type CharOf<T extends string> = T extends `${infer Char}${infer Tail}` ? Char | CharOf<Tail> : never;