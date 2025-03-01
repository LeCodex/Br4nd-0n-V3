import { BotModule } from "./base";
import { Concrete } from "src/interfaces";
import Ping from "./ping";
import Random from "./random";

export const modules: Concrete<typeof BotModule>[] = [Ping, Random];