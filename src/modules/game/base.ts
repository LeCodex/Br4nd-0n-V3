import { ChatInputCommandInteraction, MessageFlags, TextChannel } from "discord.js";
import DB from "db";
import Logger from "logger";
import { BotModule, BotCommand } from "../base";
import { Game } from ".";

export default function GameModule() {
    abstract class GameModule extends BotModule {
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

        @BotCommand({ subcommand: "start", description: "Start a game", defaultMemberPermissions: ["ManageChannels"] })
        public async start(interaction: ChatInputCommandInteraction) {
            if (this.game(interaction.channelId)) {
                return interaction.reply({ content: "A game is already going in this channel", flags: MessageFlags.Ephemeral });
            }

            const game = this.games[interaction.channelId] = await this.instantiate(interaction);
            while (!game.channel) { };
            await game.start();
            await interaction.reply("Started");
        }

        protected abstract instantiate(interaction: ChatInputCommandInteraction): Promise<Game>;

        @BotCommand({ subcommand: "toggle", description: "Pause/Unpause a currently ongoing game", defaultMemberPermissions: ["ManageChannels"] })
        public async toggle(interaction: ChatInputCommandInteraction) {
            const game = this.game(interaction.channelId);
            if (!game) {
                return interaction.reply({ content: "No game is currently in this channel", flags: MessageFlags.Ephemeral });
            }

            game.paused = !game.paused;
            await game.save();
            await interaction.reply("Paused");
        }

        @BotCommand({ subcommand: "delete", description: "Stops and deletes a currently ongoing game", defaultMemberPermissions: ["ManageChannels"] })
        public async stop(interaction: ChatInputCommandInteraction) {
            const game = this.game(interaction.channelId);
            if (!game) {
                return interaction.reply({ content: "No game is currently in this channel", flags: MessageFlags.Ephemeral });
            }

            await game.delete();
            delete this.games[interaction.channelId];
            await interaction.reply("Deleted");
        }

        public game(channelId: string) {
            return this.games[channelId];
        }
    }
    return GameModule;
}
