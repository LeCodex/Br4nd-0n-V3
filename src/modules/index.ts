import { BotModule } from "modules/base";
import Ping from "modules/ping";
import Random from "modules/random";
import CompoteDePommes from "modules/compote";
import Tartilettres from "modules/tartilettres";
import Dedalleux from "./dedalleux";
import Sakatasses from "./sak";
import YamJam from "./yamjam";
import Say from "./say";
import Steeple from "./steeple";
import Chaises from "./chaises";
import Coupdjus from "./coupdjus";
import Bingoid from "./bingoid";
import Montpartasse from "./montpartasse";
import GrosseAnim from "./grosseanim";
import Bossle from "./bossle";

export const modules: (new () => BotModule)[] = [
    Ping,
    Say,
    Random,
    CompoteDePommes,
    Tartilettres,
    Dedalleux,
    YamJam,
    Sakatasses,
    Steeple,
    Chaises,
    Coupdjus,
    Bingoid,
    Montpartasse,
    GrosseAnim,
    Bossle,
];