export function getRankEmoji(rank: number) {
    if (rank < 3) return ["🥇", "🥈", "🥉"][rank];
    return "🏅";
}