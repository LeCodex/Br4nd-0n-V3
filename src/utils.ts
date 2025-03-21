import { APIEmbed, Emoji, InteractionReplyOptions, MessagePayload, RepliableInteraction, Snowflake, User } from "discord.js";
import { Vector2 } from "./interfaces";
import { client } from "client";

export async function getEmoji(name: Snowflake, fallback: string) {
    try {
        return (await client.application!.emojis.fetch()).find((e) => e.name === name) ?? fallback
    } catch (e) {
        return fallback;
    }
}

export function getRankEmoji(rank: number) {
    if (rank < 3) return ["🥇", "🥈", "🥉"][rank];
    return "🏅";
}

export function shuffle<T>(a: T[]) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export async function replyOrFollowUp(interaction: RepliableInteraction, options: string | MessagePayload | InteractionReplyOptions) {
    if (interaction.replied) {
        await interaction.followUp(options)
    } else {
        await interaction.reply(options);
    }
}

export async function replyMultiple(interaction: RepliableInteraction, sentences: string[]) {
    // var sentences = content.split(", ");
    var form = sentences.shift()!;
    for (var sentence of sentences) {
        if (form.length + sentence.length >= 1990) {
            await replyOrFollowUp(interaction, "```\n" + form + "```");
            form = "";
        }
        form += ", " + sentence;
    }
    await replyOrFollowUp(interaction, "```\n" + form + "```");
}

export function getDist(start: Vector2, end: Vector2) {
    return Math.sqrt((start.x - end.x) ** 2 + (start.y - end.y) ** 2);
}

export class ObjectKeyMap<K extends Object, V> extends Map<K, V> {
    private equals(key1: K, key2: K) {
        return (Object.entries(key1) as Array<[keyof K, K[keyof K]]>).every(([k, v]) => key2[k] === v);
    }
    
    public set(keyPredicate: K, value: V) {
        for (const key of this.keys()) {
            if (this.equals(keyPredicate, key)) {
                return super.set(key, value);
            }
        }
        return super.set(keyPredicate, value);
    }
    
    public get(keyPredicate: K) {
        for (const key of this.keys()) {
            if (this.equals(keyPredicate, key)) {
                return super.get(key);
            }
        }
        return undefined;
    }
}

export function aStar(start: Vector2, goal: Vector2, isEmpty: (pos: Vector2) => boolean): Vector2[] {
    function reconstructPath(cameFrom: WeakMap<Vector2, Vector2>, current: Vector2) {
        const totalPath = [current];
        while (cameFrom.has(current)) {
            current = cameFrom.get(current)!;
            totalPath.unshift(current);
        }
        return totalPath;
    }

    const openSet = [start];
    const closedSet = [];
    const cameFrom = new ObjectKeyMap<Vector2, Vector2>();
    const gScore = new ObjectKeyMap<Vector2, number>();
    const fScore = new ObjectKeyMap<Vector2, number>();

    const h = (n: Vector2) => getDist(n, goal);
    gScore.set(start, 0);
    fScore.set(start, h(start));

    while (openSet.length) {
        const current = openSet.reduce((acc, element) => (fScore.get(element) ?? h(element)) < (fScore.get(acc) ?? h(acc)) ? element : acc);
        if (current.x === goal.x && current.y === goal.y) {
            return reconstructPath(cameFrom, current);
        }

        closedSet.push(current);
        openSet.splice(openSet.indexOf(current), 1);
        for (let r = 0; r < 4; r++) {
            const dx = [1, 0, -1, 0][r];
            const dy = [0, 1, 0, -1][r];
            const neighbor: Vector2 = {
                x: current.x + dx,
                y: current.y + dy
            };

            if (isEmpty(neighbor)) {
                const tentative_gScore = (gScore.get(current) ?? 0) + 1;
                if (tentative_gScore < (gScore.get(neighbor) ?? Infinity)) {
                    cameFrom.set(neighbor, current);
                    gScore.set(neighbor, tentative_gScore);
                    fScore.set(neighbor, tentative_gScore + h(neighbor));

                    if (!openSet.find(e => e.x === neighbor.x && e.y === neighbor.y) && !closedSet.find(e => e.x === neighbor.x && e.y === neighbor.y)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }
    }

    return [start];
}

export function createRankEmbed(options: APIEmbed, playersTitle: string, order: Array<{ user: User, score: number }>, scoreTitle: string, scoreEmoji: string | Emoji): APIEmbed
export function createRankEmbed(options: APIEmbed, playersTitle: string, order: Array<{ user: User, score: number, scoreStr: string }>, scoreTitle: string): APIEmbed
export function createRankEmbed(options: APIEmbed, playersTitle: string, order: Array<{ user: User, score: number, scoreStr?: string }>, scoreTitle: string, scoreEmoji?: string | Emoji): APIEmbed {
    return {
        ...options,
        fields: [
            {
                name: playersTitle,
                value: order.reduce((buffer, e) => {
                    if (e.score < buffer.lastScore) {
                        buffer.lastScore = e.score;
                        buffer.rank++;
                    }
                    buffer.message += `${getRankEmoji(buffer.rank)} **${buffer.rank + 1}.** ${e.user ? e.user.toString() : "Joueur non trouvé"}\n`;
                    return buffer;
                }, { message: "", rank: -1, lastScore: Infinity }).message,
                inline: true
            },
            {
                name: scoreTitle,
                value: order.map((e) => e.scoreStr ?? `**${e.score}** ${scoreEmoji}`).join("\n"),
                inline: true
            }
        ]
    }
}