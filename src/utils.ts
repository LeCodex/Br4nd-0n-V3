import { InteractionReplyOptions, MessagePayload, RepliableInteraction } from "discord.js";
import { Vector2 } from "./interfaces";

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
    //console.log(start.x - end.x, start.y - end.y);
    return Math.sqrt((start.x - end.x) ** 2 + (start.y - end.y) ** 2);
}

export function aStar(start: Vector2, goal: Vector2, board: boolean[][]): Vector2[] {
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
    const cameFrom = new WeakMap<Vector2, Vector2>();
    const gScore = new WeakMap<Vector2, number>();
    const fScore = new WeakMap<Vector2, number>();

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

            if (current.x + dx >= 0 && current.x + dx < board.length && current.y + dy >= 0 && current.y + dy < board.length && !board[current.y + dy][current.x + dx]) {
                const neighbor: Vector2 = {
                    x: current.x + dx,
                    y: current.y + dy
                };

                const tentative_gScore = gScore.get(current) ?? 0 + 1;
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