import { Client } from "discord.js";
import { configDotenv } from "dotenv";

configDotenv()

console.log("Bot is starting...");

const client = new Client({
    intents: []
});

client.on("ready", async () => {
    if (!client.user || !client.application) {
        return;
    }

    console.log(`${client.user.username} is online`);
});

client.login(process.env.BOT_TOKEN);

console.log(client);
