import { deflateRawSync } from 'node:zlib';

export type ZipBestand = { pad: string; inhoud: Buffer };

let crcTabel: Int32Array | null = null;

function bouwCrcTabel(): Int32Array {
  const tabel = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabel[n] = c;
  }
  return tabel;
}

function crc32(buf: Buffer): number {
  if (!crcTabel) crcTabel = bouwCrcTabel();
  let crc = -1;
  for (let i = 0; i < buf.length; i += 1) crc = (crc >>> 8) ^ crcTabel[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function dosDatumTijd(d: Date) {
  const tijd = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const datum = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { tijd, datum };
}

/**
 * Bouwt een standaard, gecomprimeerd ZIP-archief (deflate) zonder externe
 * library — Node's ingebouwde zlib volstaat voor de compressie, de rest is
 * de ZIP-bestandsstructuur zelf (lokale headers + centrale directory).
 */
export function maakZip(bestanden: ZipBestand[]): Buffer {
  const { tijd, datum } = dosDatumTijd(new Date());

  const lokaleDelen: Buffer[] = [];
  const centraleDelen: Buffer[] = [];
  let offset = 0;

  for (const { pad, inhoud } of bestanden) {
    const naam = Buffer.from(pad.replace(/\\/g, '/'), 'utf8');
    const gecomprimeerd = deflateRawSync(inhoud);
    const crc = crc32(inhoud);

    const lokaleHeader = Buffer.alloc(30);
    lokaleHeader.writeUInt32LE(0x04034b50, 0);
    lokaleHeader.writeUInt16LE(20, 4);
    lokaleHeader.writeUInt16LE(0, 6);
    lokaleHeader.writeUInt16LE(8, 8);
    lokaleHeader.writeUInt16LE(tijd, 10);
    lokaleHeader.writeUInt16LE(datum, 12);
    lokaleHeader.writeUInt32LE(crc, 14);
    lokaleHeader.writeUInt32LE(gecomprimeerd.length, 18);
    lokaleHeader.writeUInt32LE(inhoud.length, 22);
    lokaleHeader.writeUInt16LE(naam.length, 26);
    lokaleHeader.writeUInt16LE(0, 28);

    lokaleDelen.push(lokaleHeader, naam, gecomprimeerd);

    const centraleHeader = Buffer.alloc(46);
    centraleHeader.writeUInt32LE(0x02014b50, 0);
    centraleHeader.writeUInt16LE(20, 4);
    centraleHeader.writeUInt16LE(20, 6);
    centraleHeader.writeUInt16LE(0, 8);
    centraleHeader.writeUInt16LE(8, 10);
    centraleHeader.writeUInt16LE(tijd, 12);
    centraleHeader.writeUInt16LE(datum, 14);
    centraleHeader.writeUInt32LE(crc, 16);
    centraleHeader.writeUInt32LE(gecomprimeerd.length, 20);
    centraleHeader.writeUInt32LE(inhoud.length, 24);
    centraleHeader.writeUInt16LE(naam.length, 28);
    centraleHeader.writeUInt16LE(0, 30);
    centraleHeader.writeUInt16LE(0, 32);
    centraleHeader.writeUInt16LE(0, 34);
    centraleHeader.writeUInt16LE(0, 36);
    centraleHeader.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    centraleHeader.writeUInt32LE(offset, 42);

    centraleDelen.push(centraleHeader, naam);

    offset += lokaleHeader.length + naam.length + gecomprimeerd.length;
  }

  const centraleGrootte = centraleDelen.reduce((s, b) => s + b.length, 0);
  const eind = Buffer.alloc(22);
  eind.writeUInt32LE(0x06054b50, 0);
  eind.writeUInt16LE(0, 4);
  eind.writeUInt16LE(0, 6);
  eind.writeUInt16LE(bestanden.length, 8);
  eind.writeUInt16LE(bestanden.length, 10);
  eind.writeUInt32LE(centraleGrootte, 12);
  eind.writeUInt32LE(offset, 16);
  eind.writeUInt16LE(0, 20);

  return Buffer.concat([...lokaleDelen, ...centraleDelen, eind]);
}
