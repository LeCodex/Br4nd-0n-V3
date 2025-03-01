export default class Logger {
    static now() {
        return `[${new Date().toISOString()}]`;
    }

    static log(...data: any[]) {
        console.log(this.now(), ...data);
    }

    static info(...data: any[]) {
        console.info(this.now(), ...data);
    }

    static warn(...data: any[]) {
        console.warn(this.now(), ...data);
    }

    static error(...data: any[]) {
        console.error(this.now(), ...data);
    }
}