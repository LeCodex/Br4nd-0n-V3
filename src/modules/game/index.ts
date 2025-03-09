import { ChatInputCommandInteraction, MessageFlags, SendableChannels } from "discord.js";
import { BotCommand } from "../base";
import DB from "db";
import { ChatInputAplicationSubcommandData, type GameModule } from "interfaces";
import { client } from "client";

export abstract class Game {
    paused: boolean = false;
    channel?: SendableChannels;

    constructor(public module: GameModule, public channelId: string) {
        client.channels.fetch(channelId).then(async (channel) => {
            if (channel?.isSendable()) {
                this.channel = channel;
            }
        });
    }

    public async start() {
        await this.save();
    }

    public async save() {
        await DB.save(this.module.commandName, this.channelId, this.serialize());
    }

    public async delete() {
        await DB.delete(this.module.commandName, this.channelId);
    }

    protected serialize() {
        return {
            paused: this.paused
        };
    }

    static async load(module: GameModule, channelId: string, obj: Record<string, any>): Promise<Game> {
        throw new TypeError("Not implemented");
    }
}

export function GameCommand(metadata: ChatInputAplicationSubcommandData): MethodDecorator {
    return function (target: any, propertyKey: symbol | string, descriptor: PropertyDescriptor) {
        BotCommand(metadata)(target, propertyKey, descriptor);
        const originalMethod = descriptor.value as Function;
        descriptor.value = async function(this: GameModule, interaction: ChatInputCommandInteraction) {
            const game = this.game(interaction.channelId);
            if (!game) {
                return interaction.reply({ content: "No game is currently ongoing in this channel", flags: MessageFlags.Ephemeral });
            }
            return originalMethod.apply(this, [game, interaction]);
        }
        return descriptor;
    };
}