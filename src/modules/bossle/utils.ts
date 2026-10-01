import type PlayerClass from "./classes";
import * as Classes from "./classes";
import type BossleGame from "./game";
import type ShopItem from "./item";
import * as Items from "./item";
import type BosslePlayer from "./player";

export function loadItem(game: BossleGame, obj: ReturnType<ShopItem["serialize"]>) {
    const instance = new Items[obj.cls](game);
    instance.uses = obj.uses;
    return instance;
}

export function loadClass(game: BossleGame, player: BosslePlayer, obj: ReturnType<PlayerClass["serialize"]>) {
    const instance = new Classes[obj.cls](game);
    instance.extraData = obj.data;
    instance.giveTo(player);
    for (let i = 0; i < obj.level; i++) {
        instance.levelUp();
    }
    return instance;
}

export function isConsonant(letter: string) {
    return "bcdfghjklmnpqrstvwxz".includes(letter);
}
