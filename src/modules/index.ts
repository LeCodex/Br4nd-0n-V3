import { BotModule } from "./base";
import Ping from "./ping";
import Random from "./random";
import CompoteDePommes from "./compote";
import { Tartilettres } from "./tartilettres";
import { Concrete } from "src/interfaces";

export const modules: Concrete<typeof BotModule>[] = [
    Ping,
    Random,
    CompoteDePommes,
    Tartilettres
];