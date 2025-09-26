import YamJamPlayer from "./player";

export interface Figure {
    name: string,
    count: (player: YamJamPlayer) => number
}

export const figures: Record<string, Figure> = {
    triple: {
        name: "3️⃣ Brelan (Somme des dés)", 
        count: (player) => player.tray.reduce((a, e) => { a[e]! += 1; return a }, [0, 0, 0, 0, 0, 0]).filter(e => e >= 3).length ? player.tray.reduce((a, e) => a + e + 1, 0) : 0 
    },
    quadruple: {
        name: "4️⃣ Carré (Somme des dés)", 
        count: (player) => player.tray.reduce((a, e) => { a[e]! += 1; return a }, [0, 0, 0, 0, 0, 0]).filter(e => e >= 4).length ? player.tray.reduce((a, e) => a + e + 1, 0) : 0 
    },
    doublePairs: {
        name: "2️⃣ Double paire (Somme des dés)", 
        count: (player) => player.tray.reduce((a, e) => { a[e]! += 1; return a }, [0, 0, 0, 0, 0, 0]).filter(e => e >= 2).length >= 2 ? player.tray.reduce((a, e) => a + e + 1, 0) : 0
    },
    full: {
        name: "🏠 Full (25 points)",
        count: (player) => {
            const counts = player.tray.reduce((a, e) => { a[e]! += 1; return a }, [0, 0, 0, 0, 0, 0]);
            return counts.filter(e => e === 2).length === counts.filter(e => e === 3).length && counts.filter(e => e === 2).length === 1 ? 25 : 0;
        }
    },

    palindrome: {
        name: "🔀 Palindrome (Somme des dés)",
        count: (player) => player.tray[0] === player.tray[4] && player.tray[1] === player.tray[3] ? player.tray.reduce((a, e) => a + e + 1, 0) : 0
    },
    increasing: {
        name: "📈 Séquence croissante (Somme des dés de la séquence)", count: (player) => {
            const sequences = [];
            let sequence: number[] = [];
            let max_number = -1;
            for (const number of player.tray) {
                if (number > max_number) {
                    sequence.push(number);
                    max_number = number;
                } else {
                    sequences.push(sequence);
                    sequence = [];
                    max_number = -1;
                }
            }
            if (max_number != -1) sequences.push(sequence);

            const totals = sequences.map(e => e.reduce((a, f) => a + f + 1, 0));
            totals.sort();
            return totals[0]!;
        }
    },
    decreasing: {
        name: "📉 Séquence décroissante (Somme des dés de la séquence)", count: (player) => {
            const sequences = [];
            let sequence: number[] = [];
            let min_number = 6;
            for (const number of player.tray) {
                if (number < min_number) {
                    sequence.push(number);
                    min_number = number;
                } else {
                    sequences.push(sequence);
                    sequence = [];
                    min_number = -1;
                }
            }
            if (min_number != -1) sequences.push(sequence);

            const totals = sequences.map(e => e.reduce((a, f) => a + f + 1, 0));
            totals.sort();
            return totals[0]!;
        }
    },
    fifteen: {
        name: "🎯 15 pile (35 points)",
        count: (player) => player.tray.reduce((a, e) => a + e + 1, 0) === 15 ? 35 : 0
    },

    even: {
        name: "✌️ Somme des pairs",
        count: (player) => player.tray.reduce((a, e) => a + (e + 1) * (e % 2), 0)
    },
    odd: {
        name: "☝️ Somme des impairs", 
        count: (player) => player.tray.reduce((a, e) => a + (e + 1) * ((e + 1) % 2), 0) 
    },
    petals: { 
        name: "💐 Pétales (si tous impairs: 2pts par 3, 4pts par 5)", 
        count: (player) => player.tray.filter(e => (e + 1) % 2).length === 5 ? player.tray.reduce((a, e) => a + [0, 0, 2, 0, 4, 0][e]!, 0) : 0 
    },
    price_is_right: { 
        name: "*️⃣ Multiplication (40 ou moins)", 
        count: (player) => {
            let total = player.tray.reduce((a, e) => a * (e + 1), 1) 
            return total <= 40 ? total : 0;
        } 
    },
    repetition: { 
        name: "🔁 Répétition (30 points)", 
        count: (player) => JSON.stringify(player.tray.reduce((a, e) => { a[e]! += 1; return a }, [0, 0, 0, 0, 0, 0])) === JSON.stringify(player.oldTray.reduce((a, e) => { a[e]! += 1; return a }, [0, 0, 0, 0, 0, 0])) ? 30 : 0 
    },
    dversity: {
        name: "🎆 Diversité (5 points par type de dés)",
        count: (player) => player.tray.reduce<number[]>((a, e) => !a.includes(e) ? [...a, e] : a, []).length * 5
    },

    mini: {
        name: "🦠 Mini suite (20 points)", count: (player) => {
            const copy = [...player.tray];
            let min = copy.reduce((a, e) => Math.min(a, e), Infinity);
            let size = 1;

            while (copy.length) {
                copy.splice(copy.indexOf(min), 1);
                min++;
                if (copy.includes(min)) {
                    size++;
                } else {
                    size = 1;
                    min = copy.reduce((a, e) => Math.min(a, e), Infinity);
                }

                if (size >= 3) return 20;
            }

            return 0;
        }
    },
    small: {
        name: "🐛 Petite suite (30 points)", count: (player) => {
            const copy = [...player.tray];
            let min = copy.reduce((a, e) => Math.min(a, e), Infinity);
            let size = 1;

            while (copy.length) {
                copy.splice(copy.indexOf(min), 1);
                min++;
                if (copy.includes(min)) {
                    size++;
                } else {
                    size = 1;
                    min = copy.reduce((a, e) => Math.min(a, e), Infinity);
                }

                if (size >= 4) return 30;
            }

            return 0;
        }
    },
    big: {
        name: "🐍 Grande suite (40 points)", count: (player) => {
            const copy = [...player.tray];
            let min = copy.reduce((a, e) => Math.min(a, e), Infinity);
            let size = 1;

            while (copy.length) {
                copy.splice(copy.indexOf(min), 1);
                min++;
                if (copy.includes(min)) {
                    size++;
                } else {
                    size = 1;
                    min = copy.reduce((a, e) => Math.min(a, e), Infinity);
                }

                if (size >= 5) return 40;
            }

            return 0;
        }
    },

    yams: {
        name: "🎲 Yams (50 points)", count: (player) => {
            for (let i = 1; i < player.tray.length; i++) {
                if (player.tray[i] !== player.tray[0]) return 0;
            }
            return 50;
        }
    },
    quinte: { 
        name: "🃏 Quinte Flush (60 points)", 
        count: (player) => player.tray.reduce<[number, boolean]>((a, e) => [e, e === a[0] + 1 && a[1]], [player.tray[0]! - 1, true])[1] ? 60 : 0 
    }
};