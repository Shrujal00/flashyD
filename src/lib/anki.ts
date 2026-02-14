import initSqlJs from 'sql.js/dist/sql-asm.js';
import JSZip from 'jszip';
import type { Flashcard } from './ai';

let sqlPromise: Promise<any> | null = null;

function getSql() {
    if (!sqlPromise) {
        console.log('[Flashy] Initializing SQL.js (asm)...');
        sqlPromise = initSqlJs().then((SQL: any) => {
            console.log('[Flashy] SQL.js ready');
            return SQL;
        }).catch((err: any) => {
            console.error('[Flashy] SQL.js init failed:', err);
            sqlPromise = null;
            throw err;
        });
    }
    return sqlPromise;
}

export async function generateAnkiPackage(cards: Flashcard[], deckName: string): Promise<Blob> {
    console.log('[Flashy] Generating Anki package...', { cards: cards.length, deckName });
    const SQL = await getSql();
    const db = new SQL.Database();

    const now = Date.now();
    const deckId = Math.floor(Math.random() * 1e13) + 1;
    const modelId = Math.floor(Math.random() * 1e13) + 1;

    // Create Anki collection schema
    db.run(`CREATE TABLE col (id integer PRIMARY KEY, crt integer NOT NULL, mod integer NOT NULL, scm integer NOT NULL, ver integer NOT NULL, dty integer NOT NULL, usn integer NOT NULL, ls integer NOT NULL, conf text NOT NULL, models text NOT NULL, decks text NOT NULL, dconf text NOT NULL, tags text NOT NULL)`);
    db.run(`CREATE TABLE notes (id integer PRIMARY KEY, guid text NOT NULL, mid integer NOT NULL, mod integer NOT NULL, usn integer NOT NULL, tags text NOT NULL, flds text NOT NULL, sfld text NOT NULL, csum integer NOT NULL, flags integer NOT NULL, data text NOT NULL)`);
    db.run(`CREATE TABLE cards (id integer PRIMARY KEY, nid integer NOT NULL, did integer NOT NULL, ord integer NOT NULL, mod integer NOT NULL, usn integer NOT NULL, type integer NOT NULL, queue integer NOT NULL, due integer NOT NULL, ivl integer NOT NULL, factor integer NOT NULL, reps integer NOT NULL, lapses integer NOT NULL, left integer NOT NULL, odue integer NOT NULL, odid integer NOT NULL, flags integer NOT NULL, data text NOT NULL)`);
    db.run(`CREATE TABLE revlog (id integer PRIMARY KEY, cid integer NOT NULL, usn integer NOT NULL, ease integer NOT NULL, ivl integer NOT NULL, lastIvl integer NOT NULL, factor integer NOT NULL, time integer NOT NULL, type integer NOT NULL)`);
    db.run(`CREATE TABLE graves (usn integer NOT NULL, oid integer NOT NULL, type integer NOT NULL)`);

    const model: Record<string, unknown> = {};
    model[modelId.toString()] = {
        id: modelId, name: 'Basic', type: 0, mod: Math.floor(now / 1000), usn: -1, sortf: 0, did: deckId,
        tmpls: [{ name: 'Card 1', qfmt: '{{Front}}', afmt: '{{FrontSide}}<hr id=answer>{{Back}}', ord: 0, bafmt: '', bqfmt: '', did: null }],
        flds: [
            { name: 'Front', ord: 0, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
            { name: 'Back', ord: 1, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
        ],
        css: '.card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }',
        latexPre: '', latexPost: '', req: [[0, 'all', [0]]], tags: [], vers: [],
    };

    const decks: Record<string, unknown> = {
        '1': { id: 1, name: 'Default', mod: 0, usn: 0, lrnToday: [0, 0], revToday: [0, 0], newToday: [0, 0], timeToday: [0, 0], collapsed: false, desc: '', dyn: 0, conf: 1, extendNew: 10, extendRev: 50 },
    };
    decks[deckId.toString()] = {
        id: deckId, name: deckName, mod: Math.floor(now / 1000), usn: -1,
        lrnToday: [0, 0], revToday: [0, 0], newToday: [0, 0], timeToday: [0, 0],
        collapsed: false, desc: '', dyn: 0, conf: 1, extendNew: 10, extendRev: 50,
    };

    const dconf = {
        '1': {
            id: 1, name: 'Default', mod: 0, usn: 0, maxTaken: 60, autoplay: true, timer: 0, replayq: true,
            new: { bury: true, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 7], order: 1, perDay: 20 },
            rev: { bury: true, ease4: 1.3, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, perDay: 200, minSpace: 1 },
            lapse: { delays: [10], leechAction: 0, leechFails: 8, minInt: 1, mult: 0 },
        },
    };

    const conf = { activeDecks: [1], curDeck: 1, newSpread: 0, collapseTime: 1200, timeLim: 0, estTimes: true, dueCounts: true, curModel: modelId, nextPos: cards.length + 1, sortType: 'noteFld', sortBackwards: false, addToCur: true };

    db.run(`INSERT INTO col VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, [1, Math.floor(now / 1000), Math.floor(now / 1000), Math.floor(now / 1000), 11, 0, 0, 0, JSON.stringify(conf), JSON.stringify(model), JSON.stringify(decks), JSON.stringify(dconf), JSON.stringify({})]);

    const sep = '\x1f';
    cards.forEach((card, idx) => {
        const noteId = now + idx;
        const cardId = now + idx + cards.length;
        const guid = Array.from({ length: 10 }, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]).join('');
        const tags = card.tags ? card.tags.join(' ') : '';
        const front = card.front || '';
        const back = card.back || '';
        const flds = front + sep + back;
        let csum = 0;
        for (let i = 0; i < front.length; i++) { csum = ((csum << 5) - csum + front.charCodeAt(i)) | 0; }
        csum = Math.abs(csum);

        db.run(`INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [noteId, guid, modelId, Math.floor(now / 1000), -1, tags, flds, front, csum, 0, '']);
        db.run(`INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [cardId, noteId, deckId, 0, Math.floor(now / 1000), -1, 0, 0, idx + 1, 0, 0, 0, 0, 0, 0, 0, 0, '']);
    });

    const dbBinary = db.export();
    db.close();
    console.log('[Flashy] DB exported, size:', dbBinary.byteLength, 'bytes');

    const zip = new JSZip();
    zip.file('collection.anki2', dbBinary);
    zip.file('media', '{}');

    const blob = await zip.generateAsync({ type: 'blob' });
    console.log('[Flashy] Anki package ready, size:', blob.size, 'bytes');
    return blob;
}

export function downloadDeck(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.apkg') ? fileName : `${fileName}.apkg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
