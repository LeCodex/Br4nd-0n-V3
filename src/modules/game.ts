import { Client, CommandInteraction, MessageFlags } from "discord.js";
import { BotCommand, BotModule } from "./base";
import DB from "../db";
import { ChatInputAplicationSubcommandData } from "src/interfaces";
import Logger from "../logger";

export abstract class Game {
    paused: boolean = false;

    constructor(public module: GameModule<any>, public channelId: string) { }

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

    static async load(module: GameModule<any>, channelId: string, obj: Record<string, any>): Promise<Game> {
        throw new TypeError("Not implemented");
    }
}

export abstract class GameModule<T extends Game> extends BotModule {
    protected abstract cls: typeof Game;
    protected games: Record<string, T> = {};

    public async onLoaded() {
        const records = await DB.getRecords(this.commandName);
        for (const channelId of records) {
            const data = await DB.get<{}>(this.commandName, channelId);
            if (!data) continue;
            Logger.log(`Loading game of ${this.commandName} in channel ${channelId}`);
            this.games[channelId] = await this.cls.load(this, channelId, data) as T;
        }
        this.ready = true;
    }

    @BotCommand({ subcommand: "start", description: "Start a game", defaultMemberPermissions: [ "ManageChannels" ] })
    async start(interaction: CommandInteraction) {
        if (this.game(interaction.channelId)) {
            return await interaction.reply({ content: "A game is already going in this channel", flags: MessageFlags.Ephemeral });
        }

        const game = this.games[interaction.channelId] = this.instantiate(interaction);
        await game.save();
        await interaction.reply("Started");
    }

    protected abstract instantiate(interaction: CommandInteraction) : T;

    @BotCommand({ subcommand: "toggle", description: "Pause/Unpause a currently ongoing game", defaultMemberPermissions: [ "ManageChannels" ] })
    async toggle(interaction: CommandInteraction) {
        const game = this.game(interaction.channelId);
        if (!game) {
            return await interaction.reply({ content: "No game is currently in this channel", flags: MessageFlags.Ephemeral });
        }

        game.paused = !game.paused;
        await game.save();
        await interaction.reply("Paused");
    }

    @BotCommand({ subcommand: "delete", description: "Stops and deletes a currently ongoing game", defaultMemberPermissions: [ "ManageChannels" ] })
    async stop(interaction: CommandInteraction) {
        const game = this.game(interaction.channelId);
        if (!game) {
            return await interaction.reply({ content: "No game is currently in this channel", flags: MessageFlags.Ephemeral });
        }

        await game.delete();
        delete this.games[interaction.channelId];
    }

    game(channelId: string) {
        return this.games[channelId];
    }
}

export function GameCommand(metadata: ChatInputAplicationSubcommandData): MethodDecorator {
    return function (target: any, propertyKey: symbol | string, descriptor: PropertyDescriptor) {
        BotCommand(metadata)(target, propertyKey, descriptor);
        const originalMethod = descriptor.value as Function;
        descriptor.value = async function(this: GameModule<Game>, interaction: CommandInteraction) {
            const game = this.game(interaction.channelId);
            if (!game) {
                return await interaction.reply({ content: "No game is currently ongoing in this channel", flags: MessageFlags.Ephemeral });
            }
            return await originalMethod.apply(this, [game, interaction]);
        }
        return descriptor;
    };
}