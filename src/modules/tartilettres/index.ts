import * as fs from "fs";
import { GameCommand, GameModule } from "src/modules/game";
import { TartilettresGame } from "./game";
import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import { replyMultiple } from "src/modules/utils";
import { BotModule } from "../base";
import Logger from "src/logger";

export class Tartilettres extends GameModule(BotModule) {
    static words = new Set(fs.readFileSync(module.path + '/fr.txt').toString().split("\n").map((e) => e.trim()));
    protected cls = TartilettresGame;
    name = "Tartilettres";
    description = "Joue au Scrabble avec des peignes";
    commandName = "tarti";
    color = 0x008000;

    protected instantiate(interaction: ChatInputCommandInteraction): TartilettresGame {
        return new TartilettresGame(this, interaction.channelId);
    }

    @GameCommand({
        subcommand: "submit", description: "Envoie un mot", options: [
            { name: "mot", description: "Le mot", type: ApplicationCommandOptionType.String, maxLength: 10, minLength: 5, required: true }
        ]
    })
    public async submit(game: TartilettresGame, interaction: ChatInputCommandInteraction) {
        return game.sendWord(interaction);
    }

    @GameCommand({ subcommand: "used", description: "Affiche les mots utilisés"})
    public async used(game: TartilettresGame, interaction: ChatInputCommandInteraction) {
        game.saidWords = game.saidWords.sort();
        return replyMultiple(interaction, game.saidWords);
    }

    @GameCommand({ subcommand: "show", description: "Affiche la table"})
    public async show(game: TartilettresGame, interaction: ChatInputCommandInteraction) {
        return game.sendTable(interaction);
    }
}