import * as fs from "fs";
import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import { replyMultiple } from "utils";
import { GameCommand } from "modules/game";
import GameModule from "modules/game/base";
import TartilettresGame from "./game";

export default class Tartilettres extends GameModule() {
    protected cls = TartilettresGame;
    name = "Tartilettres";
    description = "Joue au Scrabble avec des peignes";
    commandName = "tarti";
    color = 0x008000;
    words = new Set(fs.readFileSync('config/tartilettres/fr.txt').toString().split("\n").map((e) => e.trim()));

    protected async instantiate(interaction: ChatInputCommandInteraction) {
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
