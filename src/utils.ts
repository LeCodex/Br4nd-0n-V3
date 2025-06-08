import { APIEmbed, Emoji, InteractionReplyOptions, MessagePayload, RepliableInteraction, Snowflake, User } from "discord.js";
import { CharOf, Vector2 } from "./interfaces";
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

function reconstructPath(cameFrom: WeakMap<Vector2, Vector2>, current: Vector2) {
    const totalPath = [current];
    while (cameFrom.has(current)) {
        current = cameFrom.get(current)!;
        totalPath.unshift(current);
    }
    return totalPath;
}

export function aStar(start: Vector2, goal: Vector2, isEmpty: (pos: Vector2) => boolean): Vector2[] {
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

export function toMultiSorted<T>(array: Array<T>, compareFn: (a: T, b: T) => Array<number> = (a, b) => [a > b ? 1 : a < b ? -1 : 0]) {
    return array.toSorted((a, b) => compareFn(a, b).find((e) => e !== 0) ?? 0);
}

export function toRanked<U extends { score: Array<number> }>(array: Array<U>) {
    const sorted = toMultiSorted(array, (a, b) => a.score.map((e, i) => b.score[i] - e));
    return sorted.reduce((a, e) => {
        if (e.score.some((e, i) => e < (a.lastScore[i] ?? Infinity))) {
            a.lastScore = e.score;
            a.rank++;
        }
        a.result.push({ rank: a.rank, ...e });
        return a;
    }, { rank: -1, lastScore: [] as Array<number>, result: [] as (U & { rank: number })[] }).result;
}

export function createRankEmbed(options: APIEmbed, playersTitle: string, players: Array<{ user: User, score: Array<number>, playerStr?: string }>, scoreTitle: string, scoreEmoji: string | Emoji): APIEmbed
export function createRankEmbed(options: APIEmbed, playersTitle: string, players: Array<{ user: User, score: Array<number>, scoreStr: string, playerStr?: string }>, scoreTitle: string): APIEmbed
export function createRankEmbed(options: APIEmbed, playersTitle: string, players: Array<{ user: User, score: Array<number>, scoreStr?: string, playerStr?: string }>, scoreTitle: string, scoreEmoji?: string | Emoji): APIEmbed {
    const ranked = toRanked(players);
    const playersLines = maxCharsLines(
        ranked.map((e) => `${getRankEmoji(e.rank)} **${e.rank + 1}.** ${e.playerStr ?? e.user?.toString() ?? "Joueur non trouvé"}`)
            .join("\n")
    );
    const scoreLines = maxCharsLines(ranked.map((e) => ({ value: e.scoreStr ?? `**${e.score[0]}** ${scoreEmoji}`, score: e.score })).map((e) => e.value).join("\n"));
    const maxLines = Math.min(playersLines.length, scoreLines.length);

    return {
        ...options,
        fields: [
            {
                name: playersTitle,
                value: playersLines.slice(0, maxLines).join("\n"),
                inline: true
            },
            {
                name: scoreTitle,
                value: scoreLines.slice(0, maxLines).join("\n"),
                inline: true
            }
        ]
    }
}

export function maxCharsLines(message: string, chars: number = 1024) {
    const lines = [];
    let length = 0;
    for (const line of message.split("\n")) {
        if (length + line.length > chars) {
            break;
        }
        lines.push(line);
        length += line.length + 1;
    }
    return lines;
}

export function randomlyPick<T extends string>(input: T): CharOf<T>
export function randomlyPick<T extends readonly unknown[]>(input: T): T[number]
export function randomlyPick<T extends string | unknown[]>(input: T) {
    return input[Math.floor(Math.random() * input.length)];
}

export const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
export const COLORED_SQUARES = ["🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "🟫", "⬜"];
export const BANNED_EMOJIS = ["⬛", "◼", "◾", "▪", "🖤", "〰", "➗", "✖", "➖", "➕", "➰", "🪑"];