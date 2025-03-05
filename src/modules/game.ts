import { CommandInteraction, MessageFlags, PermissionFlagsBits } from "discord.js";
import { BotCommand, BotModule } from "./base";
import DB from "../db";

export abstract class Game {
    paused: boolean = false;

    constructor(public channelId: string) { }

    protected serialize() {
        return {
            paused: this.paused
        };
    }

    protected abstract parse(obj: ReturnType<typeof this.serialize>): void;

    public async save(collection: string) {
        await DB.save(collection, this.channelId, this.serialize());
    }

    public async delete(collection: string) {
        await DB.delete(collection, this.channelId);
    }
}

export abstract class GameModule<T extends Game> extends BotModule {
    protected games: Record<string, T> = {};

    @BotCommand({ subcommand: "start", description: "Start a game", defaultMemberPermissions: [ "ManageChannels" ] })
    async start(interaction: CommandInteraction) {
        if (this.game(interaction.channelId)) {
            return await interaction.reply({ content: "A game is already going in this channel", flags: MessageFlags.Ephemeral });
        }

        const game = this.games[interaction.channelId] = this.instantiate(interaction.channelId);
        await game.save(this.commandName);
        await interaction.reply("Started");
    }

    protected abstract instantiate(channelId: string) : T;

    @BotCommand({ subcommand: "toggle", description: "Pause/Unpause a currently ongoing game", defaultMemberPermissions: [ "ManageChannels" ] })
    async toggle(interaction: CommandInteraction) {
        const game = this.game(interaction.channelId);
        if (!game) {
            return await interaction.reply({ content: "No game is currently in this channel", flags: MessageFlags.Ephemeral });
        }

        game.paused = !game.paused;
        await game.save(this.commandName);
        await interaction.reply("Paused");
    }

    @BotCommand({ subcommand: "delete", description: "Stops and deletes a currently ongoing game", defaultMemberPermissions: [ "ManageChannels" ] })
    async stop(interaction: CommandInteraction) {
        const game = this.game(interaction.channelId);
        if (!game) {
            return await interaction.reply({ content: "No game is currently in this channel", flags: MessageFlags.Ephemeral });
        }

        await game.delete(this.commandName);
        delete this.games[interaction.channelId];
    }

    game(channelId: string) {
        return this.games[channelId];
    }
}