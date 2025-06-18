import { APIEmbed, ChatInputCommandInteraction, MessageFlags, StringSelectMenuInteraction, User } from "discord.js";
import { Game } from "modules/game";
import MontpartassePlayer from "./player";
import Cup, * as Cups from "./cup";
import { random, range } from "lodash";
import { getRankEmoji, randomlyPick, toRanked } from "utils";
import MontpartasseView from "./view";
import Montpartasse from ".";
import { DateTime } from "luxon";
import View from "view";
import { Concrete } from "interfaces";

const NonDefaultCups = Object.entries(Cups).filter(([k, v]) => k !== "default" ).map(([_, v]) => v) as Array<Omit<typeof Cups, "default">[keyof Omit<typeof Cups, "default">]>;
const RollableCups = NonDefaultCups.filter((e) => e.canBeRolled);
const AllColors = ["blue", "orange", "green", "purple", "special"] as const
const BasicCups = RollableCups.filter((e) => (AllColors as readonly string[]).slice(0, 4).includes(e.color));
const SpecialCups = RollableCups.filter((e) => !BasicCups.includes(e));
const CustomMessages = [
    "La pile s'est effrondée! Oh non!",
    "ATCHOUM ! Sortez les cirés, cachez-vous sous les chaises, Chris a éternué ! L'air explusé de son gros nez a provoqué une déviation vers l'ouest qui a fait se renverser la pile.",
    "Un tremblement de terre de magnitude 0.5 sur l'échelle de Richter a fait s'effondrer la pile... Ah non, c'est un jet de trébuchet à tasses. Avec un trébuchet à tasses.",
    "La tasse a été posée, tout le monde a regardé, puis s'est rendu compte qu'une condition était vérifiée et ils ont tapé dedans pour la faire tomber. Des fois on respecte juste les règles.",
    "Nilphesai arrive avec sa grosse boule de bowling de champion départemental de Seine-et-Oise (diamètre d'1m20, pas étonnant) et défonce littéralement la pile. Strike et dix de der.",
    "Pendant qu'AirDur dessinait la pile sur son carnet, la position des anses aidant, elle a activé un sort d'annihilation sur la pile avec sa styloguette. Elle aurait pu annihilier le bar au moins...",
    "Holly a renversé du sel. C'est bien suffisant pour faire tomber une pile. En fait, quoiqu'il fasse, ça fait tomber un truc, ça casse des machins et ça lance des tasses. Souvent dans la gueule.",
    "La table s'est prise une flèche dans le genou, du coup elle est plus droite et la pile s'est renversée en voulant poser la tasse. Et le gâteau c'est du fake, on sait pas cuisiner.",
    "Vous avez fait un rêve la nuit dernière. Vous trouviez la goldentasse, avec la gloire et la richesse que ça implique. Et vous vous en êtes souvenu pile là. Et justement, la pile...",
    "\"Tiens, ça fait longtemps que j'ai pas passé Les Sardines de Patrick Sébastien\" se disait Chris. Quelle bonne idée de faire sauter les gens sur place au moment où vous jouez.",
    "Soudain, une plume de l'oreiller de Venus (dont elle ne se sert jamais) vole en direction de votre aisselle droite. On aura jamais entendu un rire aussi gras.",
    "Au moment où vous posez votre tasse, vous vous rendez compte que Solstice a beaucoup trop de points au classement. La rage vous fait alors faire une clé de bras à la pile. Ippon.",
    "Vous connaissez ce moment, au Jungle Speed, où vous avez une paire avec votre voisin et qu'il y a un pot avec la moitié du paquet ? Pourquoi vous avez sauté sur la pile alors ?",
    "Et c'est à ce moment où quelqu'un a appelé Compote de pommes. L'équivalent de la production annuelle de Normandie a envahi la salle, pour le plaisir de Holly. Moins pour celui de la pile.",
    "Non mais quelle idée de poser la tasse sur l'anse aussi. \"C'est pour les points de style\", sérieux ? Vous voulez encore casser nos jeux, oui. Je vais aller remplir un formulaire.",
    "En posant votre tasse, vous avez louché. Votre œil gauche à vu le nez de Chris qui coulait, le droit a repéré Holly qui dansait. Dégoût 1, pile 0. C'est une référence à Dominique Farrugia.",
    "\"Mais pourquoi pas faire une pyramide ?\". Cette remarque de Tsuby a foutu tout le monde en rogne, qui lui a lancé tout ce qui était à portée : chaises, ampoules, débats, Garfield... Et la pile.",
    "Vous deviez recevoir un appel très important aujourd'hui. Pour ne pas le manquer, vous avez mis votre portable sur vibreur puissance max. Plus qu'à attVRRR VRRR VRRR VRRR VRRR VRRR",
    "Pour une fois que vous jouez correctement, il y a un nouveau client qui entre dans le bar. Pour une fois que quelqu'un entre dans le bar, il y a une tempête à 180 km/h dehors.",
    "La pile était belle, tout était bien aligné. Jusqu'à ce que Chris se rende compte que la première tasse posée était sa BTF (Best Tasse Forever). On ne discute pas les caprices du Pôtron.",
    "En voyant la hauteur de la pile, Chris à eu l'idée d'un concours de pole dance. Mais il n'avait pas précisé que la pile ne devait pas servir de barre. On ne dira pas qui a essayé.",
    "Holly et Chris ont trinqué trop fort, les étincelles ont provoqué un feu ! Les pompiers sont arrivés très rapidement, ils ont juste eu à descendre le long de la barre... Ah, c'était la pile.",
    "En posant votre tasse, la pile s'est transformé en grosse pile AAAAAA dont les volts vous ont touchés. Évidemment, on l'a retirée pour pouvoir continuer à jouer. Votre santé ? Connais pas.",
    "Des indiens qui passaient par là ont pensé que la pile était en fait le totem d'Ysun. Ils ont dansé autour de la table, tenté de scalper Arma (une idée de Chris) puis emmené la pile avec eux.",
    "\"Ok, donc vous avez posé la tasse, puis tout le monde a cligné des yeux en même temps et pouf, apu la pile ? Non mais vous croyez que je vais gober ça ?\" Tout le monde a alors cligné des yeux.",
    "Je sais, on aurait pas dû casser la pile. Mais au bout de 353 mètres de hauteur, fallait qu'on intervienne. La grue coûte une blinde, faut qu'on bouche le toit et un avion a failli rentrer dedans.",
    "Vous connaissez la blague de tasse le Yoshi ? C'est un Yoshi qui devait se prendre une tasse mais comme vous savez pas viser vous avez lancé le Yoshi contre une pile de tasses pour pas vous rater.",
    "C'est alors qu'un camion arriva en trombe dans le bar, manquant d'écraser tout le monde. Seule la pile n'a pas survé... Ah non, c'était le chat de Venus. Désolé, j'ai lu ce qu'a écrit Booti.",
    "Je voulais profiter de ce bot pour vous délivrer un message : vous êtes les meilleurs. Non, vraiment, j'insiste. C'est super de vous avoir ici. La pile ? Oui bah non, on peut pas tout avoir.",
    "En voyant la hauteur de la pile, la Délégation a décidé de faire passer un test anti-dopage aux tasses qui s'y trouvent. Elle les a donc réquisitionnées et emmenées aux toilettes pour... Pardon ?",
    "La dernière tasse que vous avez posée touche le plafond (vous avez fait comment ?). Alphard est alors arrivée avec une masse pour exploser le plafond. On a bien ri, puis on a flippé. Fin du tour.",
    "Solstice se mit alors à raconter une histoire impliquant une petite fille, un chaton et une tronçonneuse. Un truc tellement triste qu'on a retrouvé la pile... Complètement effondrée.",
    "Braxer s'est posé sur la première tasse, pour voir s'il était capable de pondre un œuf. Mais comme il a le vertige et que 30 cm c'est déjà trop haut pour lui, faut qu'on arrête ce tour. Désolé.",
    "Tolizebra a collé des stickers :slurp: sur toute la pile. Quand Booti est arrivé, ça a été un vrai carnage. La panIIIIIIIIIIIIIIIIK, en quelque sorte. Si vous cherchez Toli, il est aux toilettes.",
    "Afin de déconcentrer les joueurs, tout le monde a décidé de sauter sur place au même moment... Le bar s'est effondré. La pile, elle, va bien. Vous par contre, si je vous trouve...",
    "Et là, Nilphesai nous a montré sa dextérité en retirant la nappe sous la pile sans la faire tomber. Mais il n'y avait pas de nappe, il a donc retiré la table. Pas besoin de vous raconter la suite.",
    "Quelqu'un a lancé une assiette, Br4nd-0n l'a répérée, et la réserve de tasses était trop loin. Dommage que toutes les tasses de la pile n'aient pas suffit pour la toucher avec la tassling."
];

export default class MontpartasseGame extends Game {
    players: Record<string, MontpartassePlayer> = {};
    stack: Array<Cup> = [];
    lastPlayed?: MontpartassePlayer;
    lastIndex?: number;
    summary: Array<string> = [];
    view?: MontpartasseView;
    waitTime = 15;
    declare module: Montpartasse;

    constructor(module: Montpartasse, channelId: string) {
        super(module, channelId);
    }

    public get rankedPlayers() {
        return toRanked(Object.values(this.players).map((e) => ({ ...e, str: e.toString(), score: [e.score] })));
    }

    public async start(interaction: ChatInputCommandInteraction) {
        this.newStack();
        await this.sendBoard();
        await this.save();
        await super.start(interaction);
    }

    public async swapCup(interaction: StringSelectMenuInteraction) {
        const index = Number(interaction.values[0]);
        if (isNaN(index) || !this.stack[index]) {
            return interaction.reply({ content: "Index invalide", flags: MessageFlags.Ephemeral });
        }

        const player = this.getPlayer(interaction.user);
        if (player.nextTimestamp > Date.now()) {
            return await interaction.reply({ content: `Veuillez attendre <t:${Math.floor(player.nextTimestamp / 1000)}:t> pour jouer de nouveau`, flags: MessageFlags.Ephemeral });
        }
        const interval = this.waitTime * 60 * 1000;
        player.nextTimestamp = Math.floor(DateTime.utc().plus({ minute: this.waitTime }).toMillis() / interval) * interval;
        if (this.stack[index].player) {
            return interaction.reply({ content: "Cette tasse appartient à un.e joueur.se et ne peut pas être remplacée", flags: MessageFlags.Ephemeral });
        }

        await interaction.deferUpdate();
        this.lastPlayed = player;
        this.lastIndex = index;
        this.summary.length = 0;

        const handCup = player.hand.shift()!;
        handCup.player = player;
        const stackCup = this.stack.splice(index, 1, handCup)[0];
        player.hand.push(stackCup);

        handCup.whenPlayed(index);
        stackCup.whenPickedUp(index);
        for (const cup of this.stack) {
            cup.whenOtherCupPlayed(handCup);
        }

        await this.sendBoard();
        const group = this.checkEnd();
        if (group) {
            await this.stackFalls(player, group);
        } else if (this.stack.every((e) => e.player)) {
            this.stack.forEach((e) => { delete e.player; });
            this.summary.push("🔄 Aucune tasse ne peut être échangée mais la pile n'est pas tombée: **les appartenances ont été effacées.**");
            await this.sendBoard();
        }
        await this.save();
    }

    public async sendBoard(edit: boolean = true, resend: boolean = false) {
        const embed: APIEmbed = {
            title: `Montpartasse ${this.lastPlayed ? ` - Tasse de ${this.lastPlayed.user.displayName}` : ""}`,
            description: this.stack.map((e, i) => `${i+1}. ${e.emoji}${this.lastIndex === i ? "✨" : ""}${e.player ? ` ${e.player}` : ""}`).join("\n") + `\n\n${this.summary.join("\n")}`,
            fields: [
                {
                    name: "Joueur.se.s",
                    value: this.rankedPlayers.map((e) => `${getRankEmoji(e.rank)} ${e.rank + 1}. ${e.str}: **${e.score}** pts | ${e.hand.map((e) => e.emoji).join("")}`).join("\n"),
                }
            ],
            color: this.module.color
        }

        if (this.view) {
            if (edit) {
                this.view = await new MontpartasseView(this, this.view.message).edit({ embeds: [embed] });
            } else {
                await this.view.resend({ embeds: [embed] }, resend);
            }
        } else if (this.channel) {
            this.view = await new MontpartasseView(this).send(this.channel, { embeds: [embed] });
        }
    }

    public getRandomCup() {
        return new (random(4) ? randomlyPick(BasicCups) : randomlyPick(SpecialCups))(this);
    }

    public loadCup(obj: ReturnType<Cup["serialize"]>) {
        return new Cups[obj.cls as keyof Omit<typeof Cups, "default">](this, obj.player ? this.players[obj.player] : undefined);
    }

    private checkEnd() {
        if (this.stack.length < AllColors.length) {
            return this.stack;
        }

        for (let i = 0; i < this.stack.length - AllColors.length; i++) {
            const colorTotals: Partial<Record<Cups.CupColor, number>> = {};
            const group = range(5).map((j) => this.stack[i + j]);
            for (const cup of group) {
                const cupColors = cup.color === "all" ? AllColors : cup.color === "none" ? [] : [cup.color] as const;
                for (const color of cupColors) {
                    colorTotals[color] = (colorTotals[color] ?? 0) + 1;
                }
            }
            if (Object.keys(colorTotals).length >= 5 || Object.values(colorTotals).some((e) => e >= 5)) {
                return group;
            }
        }

        return undefined;
    }

    private async stackFalls(responsible: MontpartassePlayer, group: Array<Cup>) {
        const embed: APIEmbed = {
            title: "Montpartasse - Fin de pile",
            description: randomlyPick(CustomMessages) + "\n\n",
            color: this.module.color
        };

        if (group.length < AllColors.length) {
            embed.description += `Il n'y avait **plus assez de tasses dans la pile**.\n`;
        } else if (group[0].color === group[1].color) {
            embed.description += `Il y avait **${AllColors.length} tasses de même couleur adjacentes**.\n`;
        } else {
            embed.description += `Il y avait **${AllColors.length} tasses de couleurs différentes adjacentes**.\n`;
        }

        const responsiblePoints = this.stack.filter((e) => e.player === responsible).length;
        embed.description += `${responsible} gagne **1 point pour chacune de ses tasses dans la pile**, soit ${responsiblePoints} point${responsiblePoints > 1 ? "s" : ""}.\n\n`;
        responsible.score += responsiblePoints;
        if (group.some((e) => e.player)) {
            embed.description += `Chaque autre joueur.se gagne **1 point pour chacune de ses tasses dans le groupe qui a fait chuter la pile**:\n`;
            for (const cup of group) {
                if (cup.player) {
                    embed.description += `- ${cup.emoji} ${cup.player} gagne 1 point\n`;
                    cup.player.score++;
                }
            }
        }

        if (this.channel) {
            await this.channel.send({ embeds: [embed] });
        }

        this.newStack();
        this.view?.end();
        delete this.view;
        delete this.lastPlayed;
        delete this.lastIndex;
        await this.sendBoard();
    }

    private getPlayer(user: User) {
        return this.players[user.id] ??= new MontpartassePlayer(this, user);
    }

    private newStack() {
        do {
            const length = Math.floor(Math.random() * 10) + 7;
            this.stack = range(length).map((_) => this.getRandomCup());
        } while (this.checkEnd());
    }

    protected serialize() {
        return {
            ...super.serialize(),
            players: Object.fromEntries(Object.entries(this.players).map(([k, v]) => [k, v.serialize()])),
            stack: this.stack.map((e) => e.serialize()),
            lastPlayed: this.lastPlayed?.user.id,
            lastIndex: this.lastIndex,
            summary: this.summary,
            view: this.view?.serialize(),
            waitTime: this.waitTime,
        }
    }

    static async load(module: Montpartasse, channelId: string, obj: ReturnType<MontpartasseGame["serialize"]>): Promise<MontpartasseGame> {
        const instance = new this(module, channelId);
        instance.players = Object.fromEntries(await Promise.all(Object.entries(obj.players).map(async ([k, v]) => [k, await MontpartassePlayer.load(instance, v)])));
        instance.stack = obj.stack.map((e) => instance.loadCup(e));
        if (obj.lastPlayed) instance.lastPlayed = instance.players[obj.lastPlayed];
        instance.lastIndex = obj.lastIndex;
        instance.summary = obj.summary;
        if (obj.view) instance.view = new MontpartasseView(instance, await View.load(obj.view));
        await instance.sendBoard();
        await instance.save();
        return instance
    }
}