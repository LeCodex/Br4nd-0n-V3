import * as fs from "fs";
import Logger from "./logger";

export default class DB {
    private static getCollectionPath(collection: string) {
        return `./.data/${collection.toLowerCase()}`;
    }

    private static getSavePath(collection: string, name: string) {
        return `${this.getCollectionPath(collection)}/${name.toLowerCase()}.json`;
    }

    public static async save(collection: string, name: string, data: any) {
        const json = JSON.stringify(data);
        if (!fs.existsSync(this.getCollectionPath(collection))) fs.mkdirSync(this.getCollectionPath(collection), { recursive: true });
        fs.writeFile(this.getSavePath(collection, name), json, err => { if (err != null) Logger.error(err) });
        Logger.log(collection + " JSON data saved");
    }

    public static async load<T>(collection: string, name: string, fallback: T) {
        if (!await this.saveExists(collection, name)) {
            this.save(collection, name, fallback);
            return fallback;
        }

        const json = fs.readFileSync(this.getSavePath(collection, name)).toString();
        return JSON.parse(json) as T;
    }

    public static async saveExists(collection: string, name: string) {
        return fs.existsSync(this.getSavePath(collection, name));
    }
}