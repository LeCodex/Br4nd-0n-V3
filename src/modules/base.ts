import { ChatInputCommandInteraction, Client, Message, MessageFlags, OmitPartialGroupDMChannel } from "discord.js";
import { BotCommand, BotSubcommandMetadata, ChatInputAplicationSubcommandData } from "src/interfaces";
import Logger from "src/logger";

export const BotCommands = Symbol("BotCommands");

export abstract class BotModule {
    public abstract name: string;
    public abstract description: string;
    public abstract commandName: string;
    public abstract color: number;
    
    public commands: BotCommand[] = [];
    protected ready = false;
    protected dmPermission: boolean = false;

    constructor(public client: Client) {
        for (const metadata of this.constructor.prototype[BotCommands] as BotSubcommandMetadata[] ?? []) {
            this.commands!.push({
                ...metadata,
                module: this,
                dmPermission: metadata.dmPermission ?? this.dmPermission,
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

    public onLoaded() { }
    public onMessage(message: OmitPartialGroupDMChannel<Message<boolean>>) { }
}

export function BotCommand(metadata: ChatInputAplicationSubcommandData): MethodDecorator {
    return function (target: any, propertyKey: symbol | string, descriptor: PropertyDescriptor) {
        target[BotCommands] ??= [] as BotSubcommandMetadata[]
        target[BotCommands].push({ ...metadata, method: propertyKey });
    };
}
