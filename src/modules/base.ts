import { Client, CommandInteraction } from "discord.js";
import { BotCommand, BotSubcommandMetadata, ChatInputAplicationSubcommandData } from "../interfaces";

export const BotCommands = Symbol("BotCommands");

export abstract class BotModule {
    abstract name: string;
    abstract description: string;
    abstract commandName: string;
    abstract color: number;

    dmPermission: boolean = false;

    commands: BotCommand[] = [];
    ready = false;

    constructor(public client: Client) {
        const commandsMetadata = this.constructor.prototype[BotCommands] as BotSubcommandMetadata[];
        for (const metadata of commandsMetadata ?? []) {
            this.commands.push({
                ...metadata,
                module: this,
                dmPermission: metadata.dmPermission ?? this.dmPermission,
                callback: async (...args: any) => {
                    if (this.ready) await (this as any)[metadata.method](...args);
                }
            });
        }
    }

    async command(interaction: CommandInteraction) {
        throw TypeError("Not implemented");
    }
}

export function BotCommand(metadata: ChatInputAplicationSubcommandData): MethodDecorator {
    return function (target: any, propertyKey: symbol | string, descriptor: PropertyDescriptor) {
        target[BotCommands] ??= [] as BotSubcommandMetadata[];
        target[BotCommands].push({ ...metadata, method: propertyKey });
    };
}
