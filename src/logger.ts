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
        console.warn(this.now(), "\x1b[33m",  ...data, "\x1b[0m");
    }

    static error(...data: any[]) {
        console.error(this.now(), "\x1b[31m", ...data, "\x1b[0m");
    }
}