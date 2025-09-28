import BossleGame from "./game";
import ShopItem, * as Items from "./item";

export function loadItem(game: BossleGame, obj: ReturnType<ShopItem["serialize"]>) {
    const instance = new Items[obj.cls](game);
    instance.uses = obj.uses;
    return instance;
}
