import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { BotCommand, BotModule } from "./base";
import DB from "../db";
import { ChatInputAplicationSubcommandData, Constructor } from "src/interfaces";
import Logger from "../logger";

export abstract class Game {
    paused: boolean = false;

    constructor(public module: GameModule, public channelId: string) { }

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

export function GameModule(base: typeof BotModule) {
    abstract class GameModule extends base {
        protected abstract cls: typeof Game;
        protected games: Record<string, Game> = {};
    
        public async onLoaded() {
            const records = await DB.getRecords(this.commandName);
            for (const channelId of records) {
                const data = await DB.get<{}>(this.commandName, channelId);
                if (!data) continue;
                Logger.log(`Loading game of ${this.commandName} in channel ${channelId}`);
                this.games[channelId] = await this.cls.load(this, channelId, data);
            }
            this.ready = true;
        }
    
        @BotCommand({ subcommand: "start", description: "Start a game", defaultMemberPermissions: [ "ManageChannels" ] })
        public async start(interaction: ChatInputCommandInteraction) {
            if (this.game(interaction.channelId)) {
                return interaction.reply({ content: "A game is already going in this channel", flags: MessageFlags.Ephemeral });
            }
    
            const game = this.games[interaction.channelId] = this.instantiate(interaction);
            await game.save();
            await interaction.reply("Started");
        }
    
        protected instantiate(interaction: ChatInputCommandInteraction): Game {
            throw TypeError("Not implemented")
        }
    
        @BotCommand({ subcommand: "toggle", description: "Pause/Unpause a currently ongoing game", defaultMemberPermissions: [ "ManageChannels" ] })
        public async toggle(interaction: ChatInputCommandInteraction) {
            const game = this.game(interaction.channelId);
            if (!game) {
                return interaction.reply({ content: "No game is currently in this channel", flags: MessageFlags.Ephemeral });
            }
    
            game.paused = !game.paused;
            await game.save();
            await interaction.reply("Paused");
        }
    
        @BotCommand({ subcommand: "delete", description: "Stops and deletes a currently ongoing game", defaultMemberPermissions: [ "ManageChannels" ] })
        public async stop(interaction: ChatInputCommandInteraction) {
            const game = this.game(interaction.channelId);
            if (!game) {
                return interaction.reply({ content: "No game is currently in this channel", flags: MessageFlags.Ephemeral });
            }
    
            await game.delete();
            delete this.games[interaction.channelId];
        }
    
        public game(channelId: string) {
            return this.games[channelId];
        }
    }
    return GameModule;
}
type GameModule = InstanceType<ReturnType<typeof GameModule>>;

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