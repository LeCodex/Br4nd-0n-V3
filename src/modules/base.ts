import { ChatInputCommandInteraction, Message, MessageFlags, OmitPartialGroupDMChannel, Snowflake } from "discord.js";
import * as fs from "fs";
import { BotCommand, BotSubcommandMetadata, ChatInputAplicationSubcommandData } from "interfaces";

export const BotCommands = Symbol("BotCommands");
export const AdminCommands = Symbol("AdminCommands");

export abstract class BotModule {
    public abstract name: string;
    public abstract description: string;
    public abstract color: number;
    public guilds: Snowflake[] = [];

    public commands: BotCommand[] = [];
    public adminCommands: BotCommand[] = [];
    public dmPermission: boolean = false;
    protected ready = false;

    constructor(public commandName: string) {
        for (const [symbol, list, module] of [[BotCommands, this.commands, this], [AdminCommands, this.adminCommands, undefined]] as const) {
            for (const metadata of this.constructor.prototype[symbol] as BotSubcommandMetadata[] ?? []) {
                list.push({
                    ...metadata,
                    module,
                    callback: async (interaction: ChatInputCommandInteraction) => {
                        if (this.ready) {
                            await (this as any)[metadata.method](interaction);
                        } else {
                            await interaction.reply({ content: "The module is not ready yet", flags: MessageFlags.Ephemeral });
                        }
                    }
                });
            }
        }

        const guilds = this.readConfigFile("guilds.json");
        this.guilds = guilds ? JSON.parse(guilds) : [""];
    }

    protected readConfigFile(path: string) {
        if (fs.existsSync(`config/${this.commandName}/${path}`)) {
            return fs.readFileSync(`config/${this.commandName}/${path}`).toString();
        } else {
            return undefined;
        }
    }

    public async onLoaded() { }
    public onMessage(message: OmitPartialGroupDMChannel<Message<boolean>>) { }
}

export function BotCommand(metadata: ChatInputAplicationSubcommandData): MethodDecorator {
    return function (target: any, propertyKey: symbol | string, descriptor: PropertyDescriptor) {
        target[BotCommands] ??= [] as BotSubcommandMetadata[]
        target[BotCommands].push({ ...metadata, method: propertyKey });
    };
}

export function AdminCommand(metadata: ChatInputAplicationSubcommandData<false>): MethodDecorator {
    return function (target: any, propertyKey: symbol | string, descriptor: PropertyDescriptor) {
        target[AdminCommands] ??= [] as BotSubcommandMetadata[]
        target[AdminCommands].push({ ...metadata, method: propertyKey });
    };
}
