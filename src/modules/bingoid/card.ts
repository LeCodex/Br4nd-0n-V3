import { shuffle, range, identity } from "lodash";
import BingoidPlayer from "./player";
import BingoidGame from "./game";

export interface Tile {
    number: number;
    marked: BingoidPlayer | undefined;
}

export class BingoidCard extends Array<Array<Tile>> {
    uldrBingo = false;
    urdlBingo = false;
    cornerBingo = false;
    rowBingos: Array<boolean>;
    columnBingos: Array<boolean>;

    constructor(size: number, public maxNumber: number) {
        super();
        const sizeRange = range(size);
        const numbers = shuffle(range(1, maxNumber + 1));
        for (let i = 0; i < size; i++) {
            this.push([]);
            for (let j = 0; j < size; j++) {
                this[i].push({ number: numbers.pop()!, marked: undefined });
            }
        }
        this.rowBingos = sizeRange.map((_) => false);
        this.columnBingos = sizeRange.map((_) => false);
    }

    get allBingos() {
        return this.uldrBingo && this.urdlBingo && this.cornerBingo && this.rowBingos.every(identity) && this.rowBingos.every(identity);
    }

    rerollNumbers(clearMarked: boolean = false) {
        const numbers = shuffle(range(1, this.maxNumber + 1));
        for (const row of this) {
            for (const tile of row) {
                tile.number = numbers.pop()!;
                if (clearMarked) tile.marked = undefined;
            }
        }
    }

    serialize() {
        return {
            tiles: [...this].map((row) => row.map((e) => ({ ...e, marked: e.marked?.user.id }))),
            uldrBingo: this.uldrBingo,
            urdlBingo: this.urdlBingo,
            cornerBingo: this.cornerBingo,
            rowBingos: this.rowBingos,
            columnBingos: this.columnBingos,
            maxNumber: this.maxNumber
        };
    }

    static load(game: BingoidGame, obj: ReturnType<BingoidCard["serialize"]>): BingoidCard {
        const instance = new this(0, obj.maxNumber);
        instance.push(...obj.tiles.map((row) => row.map((e) => ({ ...e, marked: e.marked ? game.players[e.marked] : undefined }))));
        instance.uldrBingo = obj.uldrBingo;
        instance.urdlBingo = obj.urdlBingo;
        instance.cornerBingo = obj.cornerBingo;
        instance.rowBingos = obj.rowBingos;
        instance.columnBingos = obj.columnBingos;
        return instance;
    }
}
