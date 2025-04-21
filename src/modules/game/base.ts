import { ChatInputCommandInteraction, MessageFlags, TextChannel } from "discord.js";
import DB from "db";
import Logger from "logger";
import { BotModule, AdminCommand } from "../base";
import { Game } from ".";
import ErrorHandler from "errors";

export default function GameModule<T extends Game>() {
    abstract class GameModule extends BotModule {
        protected abstract cls: typeof Game;
        protected games: Record<string, Game> = {};

        public async onLoaded() {
            const records = await DB.getRecords(this.commandName);
            for (const channelId of records) {
                const data = await DB.get<{ paused: boolean }>(this.commandName, channelId);
                if (!data) continue;
                try {
                    Logger.log(`Loading game of ${this.commandName} in channel ${channelId}`);
                    this.games[channelId] = await this.cls.load(this, channelId, data);
                } catch (e) {
                    await ErrorHandler.handle(undefined, e);
                }
            }
            this.ready = true;
        }

        public async onToggled(game: Game) {}
        public async onDeleted(game: Game) {}

        @AdminCommand({ subcommand: "start", description: "Start a game" })
        public async start(interaction: ChatInputCommandInteraction) {
            if (this.game(interaction.channelId)) {
                return interaction.reply({ content: "A game is already going in this channel", flags: MessageFlags.Ephemeral });
            }

            const game = this.games[interaction.channelId] = await this.instantiate(interaction);
            await game.start(interaction);
        }

        protected abstract instantiate(interaction: ChatInputCommandInteraction): Promise<Game>;

        @AdminCommand({ subcommand: "toggle", description: "Pause/Unpause a currently ongoing game" })
        public async toggle(interaction: ChatInputCommandInteraction) {
            const game = this.game(interaction.channelId);
            if (!game) {
                return interaction.reply({ content: "No game is currently in this channel", flags: MessageFlags.Ephemeral });
            }

            game.paused = !game.paused;
            await this.onToggled(game);
            await game.save();
            await interaction.reply(game.paused ? "Paused" : "Resumed");
        }

        @AdminCommand({ subcommand: "delete", description: "Stops and deletes a currently ongoing game" })
        public async stop(interaction: ChatInputCommandInteraction) {
            const game = this.game(interaction.channelId);
            if (!game) {
                return interaction.reply({ content: "No game is currently in this channel", flags: MessageFlags.Ephemeral });
            }

            await game.delete();
            await this.onDeleted(game);
            delete this.games[interaction.channelId];
            await interaction.reply("Deleted");
        }

        public game(channelId: string) {
            return this.games[channelId];
        }
    }
    return GameModule;
}
