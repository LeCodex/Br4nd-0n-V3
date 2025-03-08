import { BotModule } from "src/modules/base";
import { Concrete } from "src/interfaces";
import Ping from "src/modules/ping";
import Random from "src/modules/random";
import CompoteDePommes from "src/modules/compote";
import Tartilettres from "src/modules/tartilettres";

export const modules: Concrete<typeof BotModule>[] = [
    Ping,
    Random,
    CompoteDePommes,
    Tartilettres
];