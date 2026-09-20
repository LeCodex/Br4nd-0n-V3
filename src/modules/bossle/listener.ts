import type BossleGame from "./game";
import type { BossleEvents, BossleEventHandler } from "./game";

export abstract class ListenerSource {
    listeners = new Set<[keyof BossleEvents, BossleEventHandler]>();

    constructor(public game: BossleGame) {}

    on<K extends keyof BossleEvents>(key: K, listener: BossleEventHandler<K>) {
        this.game.on(key, listener);
        this.listeners.add([key, listener as BossleEventHandler]);
    }

    off<K extends keyof BossleEvents>(key: K, listener: BossleEventHandler<K>) {
        this.game.off(key, listener);
        this.listeners.delete([key, listener as BossleEventHandler]);
    }

    clear() {
        for (const [key, listener] of this.listeners) {
            this.game.off(key, listener);
        }
        this.listeners.clear();
    }
}
