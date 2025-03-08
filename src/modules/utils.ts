import { InteractionReplyOptions, MessagePayload, RepliableInteraction } from "discord.js";

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