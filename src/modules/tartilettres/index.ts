import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import { replyMultiple } from "utils";
import { GameCommand } from "modules/game";
import GameModule from "modules/game/base";
import TartilettresGame from "./game";

export default class Tartilettres extends GameModule() {
    protected cls = TartilettresGame;
    name = "Tartilettres";
    description = "Joue au Scrabble avec des peignes";
    color = 0x008000;
    words: Set<string>;

    constructor() {
        super("tarti");
        this.words = new Set(this.readConfigFile("fr.txt")?.split("\n").map((e) => e.trim()));
    }

    protected async instantiate(interaction: ChatInputCommandInteraction) {
        return new TartilettresGame(this, interaction.channelId);
    }

    @GameCommand({
        subcommand: "submit", description: "Envoie un mot", options: [
            { name: "mot", description: "Un mot de 5 à 10 lettres", type: ApplicationCommandOptionType.String, maxLength: 10, minLength: 5, required: true }
        ]
    })
    public async submit(game: TartilettresGame, interaction: ChatInputCommandInteraction) {
        return game.sendWord(interaction);
    }

    @GameCommand({ subcommand: "used", description: "Affiche les mots utilisés", pausable: false })
    public async used(game: TartilettresGame, interaction: ChatInputCommandInteraction) {
        game.saidWords = game.saidWords.sort();
        return replyMultiple(interaction, game.saidWords);
    }

    @GameCommand({ subcommand: "show", description: "Affiche la table", pausable: false })
    public async show(game: TartilettresGame, interaction: ChatInputCommandInteraction) {
        await game.sendTable(interaction);
    }
}
