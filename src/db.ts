import * as fs from "fs";
import Logger from "./logger";

export default class DB {
    private static getCollectionPath(collection: string) {
        return `./.data/${collection.toLowerCase()}`;
    }

    private static getSavePath(collection: string, name: string) {
        return `${this.getCollectionPath(collection)}/${name.toLowerCase()}.json`;
    }

    public static async save(collection: string, name: string, data: unknown) {
        const json = JSON.stringify(data, undefined, 4);
        if (!fs.existsSync(this.getCollectionPath(collection))) fs.mkdirSync(this.getCollectionPath(collection), { recursive: true });
        fs.writeFile(this.getSavePath(collection, name), json, err => { if (err != null) Logger.error(err) });
        Logger.log(collection + " JSON data saved");
    }

    public static async get<T>(collection: string, name: string): Promise<T | undefined>
    public static async get<T>(collection: string, name: string, fallback: T): Promise<T>
    public static async get<T>(collection: string, name: string, fallback?: T): Promise<T | undefined> {
        if (!await this.saveExists(collection, name)) {
            this.save(collection, name, fallback);
            return fallback;
        }

        const json = fs.readFileSync(this.getSavePath(collection, name)).toString();
        return JSON.parse(json) as T;
    }

    public static async delete(collection: string, name: string) {
        if (!fs.existsSync(this.getCollectionPath(collection))) fs.mkdirSync(this.getCollectionPath(collection), { recursive: true });
        fs.rm(this.getSavePath(collection, name), err => { if (err != null) Logger.error(err) });
        Logger.log(collection + " JSON data deleted");
    }

    public static async saveExists(collection: string, name: string) {
        return fs.existsSync(this.getSavePath(collection, name));
    }

    public static async getRecords(collection: string) {
        const path = this.getCollectionPath(collection);
        if (!fs.existsSync(path)) fs.mkdirSync(path);
        return fs.readdirSync(path).map(e => e.slice(0, e.lastIndexOf(".")));
    }
}