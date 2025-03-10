import { BotModule } from "modules/base";
import Ping from "modules/ping";
import Random from "modules/random";
import CompoteDePommes from "modules/compote";
import Tartilettres from "modules/tartilettres";
import Dedalleux from "./dedalleux";
import Sakatasses from "./sak";

export const modules: (new () => BotModule)[] = [
    Ping,
    Random,
    CompoteDePommes,
    Tartilettres,
    Dedalleux,
    Sakatasses,
];