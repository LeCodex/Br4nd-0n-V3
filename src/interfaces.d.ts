import { ApplicationCommandOptionData, ApplicationCommandSubCommandData, ApplicationCommandSubGroupData, ButtonBuilder, ChannelSelectMenuBuilder, ChannelSelectMenuComponentData, ChatInputApplicationCommandData, ChatInputCommandInteraction, InteractionButtonComponentData, MentionableSelectMenuBuilder, MentionableSelectMenuComponentData, MessageComponentInteraction, RoleSelectMenuBuilder, RoleSelectMenuComponentData, StringSelectMenuBuilder, StringSelectMenuComponentData, UserSelectMenuBuilder, UserSelectMenuComponentData } from "discord.js";
import { BotModule } from "modules/base";
import GameModule from "modules/game/base";

export interface ChatInputAplicationSubcommandData<AllowSubcommandGroup extends boolean = true> extends Omit<ChatInputApplicationCommandData, "name" | "options" | "type"> {
    subcommand?: string;
    subcommandGroup?: AllowSubcommandGroup extends true ? string : never;
    options?: readonly Exclude<
        ApplicationCommandOptionData,
        ApplicationCommandSubGroupData | ApplicationCommandSubCommandData
    >[];
}

export interface GameSubcommandData<AllowSubcommandGroup extends boolean = true> extends ChatInputAplicationSubcommandData<AllowSubcommandGroup> {
    pausable?: boolean
}

export interface BotSubcommandMetadata extends ChatInputAplicationSubcommandData {
    method: symbol | string;
}

export interface BotCommand extends ChatInputAplicationSubcommandData {
    module?: BotModule;
    callback: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export type Constructor<T, P extends any[] = any> = new (...args: P) => T;
export type Concrete<T extends abstract new (...args: any[]) => any> = T extends abstract new (...args: infer U) => infer V ? new (...args: U) => V : never;

export type ComponentHandlerMetadata<T extends NonLinkButtonMessageActionRowComponentData = NonLinkButtonMessageActionRowComponentData> = T & {
    builder: Constructor<NonTextInputComponentBuilder>;
    method: symbol | string;
    row?: number;
    index?: number;
    pausable?: boolean;
}
export type ComponentHandlerMetadataParameter<T extends NonLinkButtonMessageActionRowComponentData> = Omit<ComponentHandlerMetadata<T>, "type" | "customId" | "custom_id" | "method" | "builder">;

export type ComponentHandler<T extends NonLinkButtonMessageActionRowComponentData = NonLinkButtonMessageActionRowComponentData> = Omit<ComponentHandlerMetadata<T>, "method"> & {
    callback: (interaction: MessageComponentInteraction) => Promise<void>;
}
export type ComponentHandlerParameter<T extends NonLinkButtonMessageActionRowComponentData> = Omit<ComponentHandler<T>, "type" | "customId" | "custom_id" | "builder">;

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
export type CharOf<T extends string> = string extends T ? string : T extends `${infer Char}${infer Tail}` ? Char | CharOf<Tail> : never;

export type GameModule = InstanceType<ReturnType<typeof GameModule>>;

export interface Vector2 {
    x: number,
    y: number
};

export type Tuple<T, N extends number> = N extends N ? number extends N ? T[] : _TupleOf<T, N, []> : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N ? R : _TupleOf<T, N, [T, ...R]>;