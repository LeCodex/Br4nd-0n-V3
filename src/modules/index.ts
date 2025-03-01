import Ping from "./ping";
import { BotModule } from "./base";
import { Concrete } from "src/interfaces";

export const modules: Concrete<typeof BotModule>[] = [
    Ping
];