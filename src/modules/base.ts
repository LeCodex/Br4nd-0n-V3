import { ChatInputCommandInteraction, Message, MessageFlags, OmitPartialGroupDMChannel, PermissionFlagsBits } from "discord.js";
import { BotCommand, BotSubcommandMetadata, ChatInputAplicationSubcommandData } from "interfaces";

export const BotCommands = Symbol("BotCommands");
export const AdminCommands = Symbol("AdminCommands");

export abstract class BotModule {
    public abstract name: string;
    public abstract description: string;
    public abstract commandName: string;
    public abstract color: number;

    public commands: BotCommand[] = [];
    public adminCommands: BotCommand[] = [];
    protected ready = false;
    protected dmPermission: boolean = false;

    constructor() {
        for (const [symbol, list, module] of [[BotCommands, this.commands, this], [AdminCommands, this.adminCommands, undefined]] as const) {
            for (const metadata of this.constructor.prototype[symbol] as BotSubcommandMetadata[] ?? []) {
                list.push({
                    ...metadata,
                    module,
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
