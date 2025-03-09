import { BotModule } from "modules/base";
import { Concrete } from "interfaces";
import Ping from "modules/ping";
import Random from "modules/random";
import CompoteDePommes from "modules/compote";
import Tartilettres from "modules/tartilettres";
import Dedalleux from "./dedalleux";

export const modules: Concrete<typeof BotModule>[] = [
    Ping,
    Random,
    CompoteDePommes,
    Tartilettres,
    Dedalleux
];