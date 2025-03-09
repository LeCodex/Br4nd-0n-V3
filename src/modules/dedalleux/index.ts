import { client } from "client";
import GameModule from "modules/game/base";
import DedalleuxGame from "./game";
import { ChatInputCommandInteraction } from "discord.js";
import { Game, GameCommand } from "../game";

export default class Dedalleux extends GameModule() {
    protected cls = DedalleuxGame;
    name = "Dédalleux";
    description = "Donne ta liste de course à Brax";
    commandName = "dedale";
    color = 0x144350;

    colors = {
        redSquare: client.emojis.cache.get("780049456263069706") || "🟥",
        blueSquare: client.emojis.cache.get("780049455830270002") || "🟦",
        greenSquare: client.emojis.cache.get("780049456048766976") || "🟩",
        yellowSquare: client.emojis.cache.get("780049455562358825") || "🟨",
        purpleSquare: client.emojis.cache.get("780049455608889345") || "🟪",
        redCirle: client.emojis.cache.get("780049455511765003") || "🛑",
        blueCircle: client.emojis.cache.get("780049455911141376") || "♾️",
        greenCircle: client.emojis.cache.get("780049455897772032") || "💚",
        yellowCircle: client.emojis.cache.get("780049456322183170") || "📀",
        purpleCircle: client.emojis.cache.get("780049455935914014") || "🟣",
    };
    pawnEmoji = client.emojis.cache.get("1036956874446221403") || "📍";

    protected async instantiate(interaction: ChatInputCommandInteraction): Promise<Game> {
        return new DedalleuxGame(this, interaction.channelId);
    }

    @GameCommand({ subcommand: "turn", description: "Turn" })
    public async turn(game: DedalleuxGame, interaction: ChatInputCommandInteraction) {
        await game.nextTurn();
        await interaction.reply("Turn");
    }
}
