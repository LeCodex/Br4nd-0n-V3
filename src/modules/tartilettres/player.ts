import { ChatInputCommandInteraction, MessageFlags, User } from "discord.js";
import TartilettresGame from "./game";
import Tartilettres from ".";
import { client } from "client";

export default class TartilettresPlayer {
    score: number = 0;
    letters: Record<string, boolean> = {};
    taboo: string[] = [];
    possibleTaboos: string[] = [];

    constructor(public game: TartilettresGame, public user: User) {
        this.resetLetters();
    }

    public async playWord(word: string, interaction: ChatInputCommandInteraction) {
        const list = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().split("");
        if (this.taboo.some(e => list.some(f => f === e))) {
            return interaction.reply({ content: "Le mot contient une de vos lettres interdites", flags: MessageFlags.Ephemeral });
        } else if (word.length !== this.game.wordLength) {
            return interaction.reply({ content: "Le mot n'a pas la bonne longueur", flags: MessageFlags.Ephemeral });
        } else if (this.game.saidWords.includes(word)) {
            return interaction.reply({ content: "Le mot a déjà été proposé", flags: MessageFlags.Ephemeral });
        } else if (list.every(e => this.letters[e])) {
            return interaction.reply({ content: "Ce mot ne retirerait aucune lettre de votre peigne", flags: MessageFlags.Ephemeral });
        } else if (!this.game.module.words.has(word)) {
            return interaction.reply({ content: "Veuillez renseigner un mot valide", flags: MessageFlags.Ephemeral });
        }

        for (const char of list) {
            if (!this.letters[char]) {
                this.letters[char] = true;
                if (this.game.letters.includes(char)) this.score++;
            }
        }

        if (this.game.letters.every(e => this.letters[e])) this.resetLetters(true);
        this.game.saidWords.push(word);
        await this.game.nextTurn(interaction);
    }

    private resetLetters(withTaboo: boolean = false) {
        this.letters = {};

        if (withTaboo) {
            if (!this.possibleTaboos.length) this.possibleTaboos = "BCDFGHLMNP".split("");
            const index = Math.floor(Math.random() * this.possibleTaboos.length);
            this.taboo.push(this.possibleTaboos.splice(index, 1)[0]);
            if (this.taboo.length > 3) this.taboo.shift();
            for (let letter of this.taboo) this.letters[letter] = true;
        }
    }

    public serialize() {
        return {
            user: this.user.id,
            score: this.score,
            letters: this.letters,
            taboo: this.taboo,
            possibleTaboos: this.possibleTaboos,
        }
    }

    public static async load(module: Tartilettres, game: TartilettresGame, obj: Record<string, any>) {
        const instance = new this(game, await client.users.fetch(obj.user));
        instance.score = obj.score;
        instance.letters = obj.letters;
        instance.taboo = obj.taboo;
        instance.possibleTaboos = obj.possibleTaboos;
    }
}
