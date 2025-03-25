import { APIEmbed, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { DateTime } from "luxon";
import { Game } from "modules/game";
import CompoteDePommesPlayer from "./player";
import { CharOf, NumberRange } from "interfaces";
import { createRankEmbed, randomlyPick, toMultiSorted, toRanked } from "utils";
import CompoteDePommes from ".";

export default class CompoteDePommesGame extends Game {
    static effectsDescription = [
        "Vous ajoutez à votre panier autant de pommes que le nombre de fois où vous avez fait 1.",
        "Planquez 5 pommes de votre panier s'il est plus gros que votre coffre, sinon ajoutez-les à votre panier.",
        "Planquez 3 pommes de votre panier s'il est plus gros que votre coffre, sinon ajoutez-les à votre panier.",
        "Planquez 1 pomme de votre panier s'il est plus gros que votre coffre, sinon ajoutez-les à votre panier.",
        "Avant votre prochaine perte de pommes, vous en planquerez une dans votre coffre, trois si vous hurlez O ou U.",
        "Ajoutez 4 pommes à votre panier.",
        "Ajoutez 2 pommes à votre panier.",
        "Votre panier perd une pomme, le double si vous hurlez Y.",
        "Votre panier perd trois pommes, le double si vous hurlez Y.",
        "Vous perdez des pommes de votre panier pour en avoir autant que dans votre coffre.",
        "Il ne se passe rien.",
        "La prochaine fois qu'un joueur vous volera des pommes, vous riposterez en lui volant le double.",
        "Vous volez une pomme au panier du précédent joueur ayant hurlé comme vous.",
        "Vous volez deux pommes au panier du joueur ayant joué avant vous.",
        "Si vous hurlez A, E ou I, vous volez trois pommes au panier du joueur précédent, sinon il vous les vole.",
        "Si vous avez moins de pommes que le joueur précédent et que vous hurlez O ou U, vous lui volez la moitié des pommes de son panier.",
        "Le joueur précédent perd une pomme de son panier, vous aussi si vous hurlez O ou U.",
        "Vous volez une pomme à chaque personne au-dessus de vous au classement.",
        "Le premier (ou les premiers si ex-aequo) du classement perd une pomme de son panier, deux si vous avez hurlé A.",
        "Votre panier perd autant de pommes que de lancers qu'il vous reste après celui-ci. Si vous n'en avez plus, vous gagnez deux lancers, un seul si vous hurlez Y."
    ] as const;

    players: Record<string, CompoteDePommesPlayer> = {};
    summary: string[] = [];
    history: CompoteDePommesPlayer[] = [];
    maxHands: number = 10;
    nextRefill: number;
    refillTimeout?: NodeJS.Timeout;

    constructor(module: CompoteDePommes, channelId: string, nextRefill?: number) {
        super(module, channelId);
        this.nextRefill = nextRefill ?? DateTime.now().setZone("Europe/Paris").toMillis();
        this.setupTimeout();
    }

    setupTimeout() {
        let next = DateTime.now().setZone("Europe/Paris");
        next = next.set({ hour: Math.floor(next.hour / 12) * 12, minute: 0, second: 0, millisecond: 0 }).plus({ hour: 12 });
        this.nextRefill = next.toMillis();

        if (this.refillTimeout) clearTimeout(this.refillTimeout);
        this.refillTimeout = setTimeout(() => this.refill(), this.nextRefill - DateTime.now().setZone("Europe/Paris").toMillis());
    }

    async refill() {
        for (const player of Object.values(this.players)) {
            player.gainHands(Math.ceil(this.maxHands / 2));
        }
        this.setupTimeout();
        await this.save();
    }

    async roll(interaction: ChatInputCommandInteraction) {
        if (this.paused) {
            return interaction.reply({ content: "Le jeu est en pause", flags: MessageFlags.Ephemeral });
        }

        const player = this.players[interaction.user.id] ??= new CompoteDePommesPlayer(this, interaction.user);
        if (player.hands === 0) {
            return interaction.reply({ content: "Vous n'avez plus de cueillettes!", flags: MessageFlags.Ephemeral });
        }
        if (player === this.history[0]) {
            return interaction.reply({ content: "Vous avez déjà joué, veuillez attendre un autre joueur.", flags: MessageFlags.Ephemeral });
        }

        player.hands--;
        this.summary.length = 0;

        const roll = Math.floor(Math.random() * 20) + 1 as NumberRange<1, 20>;
        const letter = randomlyPick("AAAAAAAAAEEEEEEEEEEEEEEEIIIIIIIIOOOOOOUUUUUUY");
        this[`roll${roll}`](player, letter);

        if (this.history.includes(player)) this.history.splice(this.history.indexOf(player), 1);
        this.history.unshift(player);
        player.lastLetter = letter;
        player.rolls++;

        if (!this.summary.length) this.summary.push(`Pas de chance pour ${player.user.toString()} ! Rien cette fois !`)
        await this.save();
        return interaction.reply({ embeds: [this.rollEmbed(player, roll, letter)] });
    }

    get rank() {
        return toRanked(Object.values(this.players).map((e) => ({ value: e, score: e.rankScore })));
    }

    get order() {
        return this.rank.map((e) => e.value);
    }

    get rankEmbed(): APIEmbed {
        return createRankEmbed(
            {
                title: "🏆 Classement",
                color: this.module.color
            },
            "Participants",
            Object.values(this.players).map((e) => ({ user: e.user, score: e.rankScore, scoreStr: `**${e.apples}** 🍎 *(${e.locked} 🔐 - ${e.basket} 🧺)*` })),
            "Pommes"
        );
    }

    get rulesEmbed(): APIEmbed {
        return {
            title: "Règles",
            description: CompoteDePommesGame.effectsDescription.map((e, i) => `**${i + 1}.** ${e}`).join("\n"),
            color: this.module.color
        };
    }

    rollEmbed(player: CompoteDePommesPlayer, roll: NumberRange<1, 20>, letter: CharOf<"AEUIOY">): APIEmbed {
        return {
            title: `Cueillette #${player.rolls} de ${player.user.displayName}`,
            description: `${player.user.toString()} obtient **${roll}** et hurle **${letter}** !\n*${CompoteDePommesGame.effectsDescription[roll - 1]}*`
                + `\n\n${this.summary.join('\n')} \n\n${player.summary}`,
            color: this.module.color
        };
    }

    // 1) Vous ajoutez à votre panier autant de pommes que le nombre de fois où vous avez fait 1.
    roll1(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        player.incrementEffect(1);
        player.gain(player.effects[1]);
    }

    // 2) Planquez 5 pommes de votre panier s'il est plus gros que votre coffre, sinon ajoutez-les à votre panier.
    roll2(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        player.stashIfGreaterOrGain(5);
    }
    
    // 3) Planquez 3 pommes de votre panier s'il est plus gros que votre coffre, sinon ajoutez-les à votre panier.
    roll3(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        player.stashIfGreaterOrGain(3);
    }
    
    // 4) Planquez 1 pomme de votre panier s'il est plus gros que votre coffre, sinon ajoutez-la à votre panier.
    roll4(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        player.stashIfGreaterOrGain(1);
    }
    
    // 5) Avant votre prochaine perte de pommes, vous en planquerez une dans votre coffre, trois si vous hurlez O ou U.
    roll5(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        player.incrementEffect(5, letter === "O" || letter === "U" ? 3 : 1);
    }
    
    // 6) Ajoutez 4 pommes à votre panier.
    roll6(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        player.gain(4);
    }
    
    // 7) Ajoutez 2 pommes à votre panier.
    roll7(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        player.gain(2);
    }
    
    // 8) Votre panier perd une pomme, le double si vous hurlez Y.
    roll8(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        player.gain(letter === "Y" ? -2 : -1);
    }
    
    // 9) Votre panier perd trois pommes, le double si vous hurlez Y.
    roll9(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        player.gain(letter === "Y" ? -6 : -3);
    }
    
    // 10) Vous perdez des pommes de votre panier pour en avoir autant que dans votre coffre.
    roll10(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        if (player.basket > player.locked) {
            player.gain(player.locked - player.basket);
        }
    }
    
    // 11) Il ne se passe rien.
    roll11(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        // Rien!
    }
    
    // 12) La prochaine fois qu'un joueur vous volera des pommes, vous riposterez en lui volant le double.
    roll12(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        player.incrementEffect(12);
    }
    
    // 13) Vous volez une pomme au panier du précédent joueur ayant hurlé comme vous.
    roll13(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        for (const other of this.history) {
            if (other.lastLetter === letter) {
                player.steal(other, 1);
                return;
            }
        }
    }
    
    // 14) Vous volez deux pommes au panier du joueur ayant joué avant vous.
    roll14(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        if (this.history.length) {
            player.steal(this.history[0], 2);
        }
    }
    
    // 15) Si vous hurlez A, E ou I, vous volez trois pommes au panier du joueur précédent, sinon il vous les vole.
    roll15(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        if (this.history.length) {
            if (letter === "A" || letter === "E" || letter === "I") {
                player.steal(this.history[0], 3);
            } else {
                this.history[0].steal(player, 3);
            }
        }
    }
    
    // 16) Si vous avez moins de pommes que le joueur précédent et que vous hurlez O ou U, vous lui volez la moitié des pommes de son panier.
    roll16(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        if (this.history.length && player.apples < this.history[0].apples && (letter === "O" || letter === "U")) {
            player.steal(this.history[0], Math.ceil(this.history[0].basket / 2));
        }
    }
    
    // 17) Le joueur précédent perd une pomme de son panier, vous aussi si vous hurlez O ou U.
    roll17(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        if (this.history.length) this.history[0].gain(-1);
        if (letter === "O" || letter === "U") player.gain(-1);
    }
    
    // 18) Vous volez une pomme à chaque personne au-dessus de vous au classement.
    roll18(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        const playerRank = this.rank.find((e) => e.value === player)?.rank ?? 0;
        for (const { value: other, rank } of this.rank) {
            if (rank === playerRank) break;
            player.steal(other, 1);
        }
    }
    
    // 19) Le premier (ou les premiers si ex-aequo) du classement perd une pomme de son panier, deux si vous avez hurlé A.
    roll19(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        for (const other of this.rank.filter((e) => e.rank === 0).map((e) => e.value)) {
            other.gain(letter === "A" ? -2 : -1);
        }
    }
    
    // 20) Votre panier perd autant de pommes que de lancers qu'il vous reste après celui-ci. Si vous n'en avez plus, vous gagnez deux lancers, un seul si vous hurlez Y.
    roll20(player: CompoteDePommesPlayer, letter: CharOf<"AEIOUY">) {
        if (player.hands > 0) {
            player.gain(-player.hands);
        } else {
            player.gainHands(letter === "Y" ? 1 : 2);
        }
    }

    protected serialize() {
        return {
            ...super.serialize(),
            players: Object.fromEntries(Object.entries(this.players).map(([k, v]) => [k, v.serialize()])),
            maxHands: this.maxHands,
            history: this.history.map(e => e.user.id),
            nextRefill: this.nextRefill,
        };
    }

    static async load(module: CompoteDePommes, channelId: string, obj: Record<string, any>): Promise<CompoteDePommesGame> {
        const instance = new this(module, channelId, obj.nextRefill);
        instance.paused = obj.paused;
        instance.players = Object.fromEntries(await Promise.all(Object.entries(obj.players).map(async ([k, v]: [string, any]) => [k, await CompoteDePommesPlayer.load(module, instance, v)])));
        instance.maxHands = obj.maxHands;
        instance.history = obj.history.map((e: string) => instance.players[e]);
        instance.setupTimeout();
        return instance;
    }
}
