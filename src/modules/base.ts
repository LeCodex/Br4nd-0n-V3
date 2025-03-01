import { ChatInputApplicationCommandData, Client } from "discord.js";
import { BotCommand, BotCommandMetadata } from "../interfaces";

const BotCommands = Symbol("BotCommands");

export abstract class BotModule {
    abstract name: string;
    abstract description: string;
    abstract color: number;

    private _commands: BotCommand[] = [];
    get commands() { return this._commands; }
    ready = false;

    constructor(public client: Client) {
        const commandsMetadata = this.constructor.prototype[BotCommands] as BotCommandMetadata[];
        for (const metadata of commandsMetadata) {
            this.commands.push({
                ...metadata,
                run: async (...args: any) => { if (this.ready) await (this as any)[metadata.method](...args) }
            });
        }
    }
}

export function BotCommand(metadata: ChatInputApplicationCommandData): MethodDecorator {
    return function (target: any, propertyKey: symbol | string, descriptor: PropertyDescriptor) {
        target[BotCommands] ??= [] as BotCommandMetadata[];
        target[BotCommands].push({ ...metadata, method: propertyKey });
    };
}
