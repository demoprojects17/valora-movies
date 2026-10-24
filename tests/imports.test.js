import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { pathToFileURL } from "node:url";
const root = process.env.VELORA_TEST_LIB;
const {
  parseCSV,
  unzip,
  keyOf,
  validateItems,
  mergeItems,
  readLetterboxd,
  mergeLetterboxd,
} = await import(
  root ? pathToFileURL(`${root}/imports.js`) : "../lib/imports.js"
);
const csvFile = (name, text) => ({ name, text: async () => text });
// Real local headers, central directory and EOCD; no ZIP package required.
function zipFile(entries) {
  const locals = [],
    central = [];
  let offset = 0;
  for (const { name, text, method = 0 } of entries) {
    const filename = Buffer.from(name),
      raw = Buffer.from(text);
    const data = method === 8 ? deflateRawSync(raw) : raw;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(filename.length, 26);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(method, 10);
    dir.writeUInt32LE(data.length, 20);
    dir.writeUInt32LE(raw.length, 24);
    dir.writeUInt16LE(filename.length, 28);
    dir.writeUInt32LE(offset, 42);
    locals.push(local, filename, data);
    central.push(dir, filename);
    offset += local.length + filename.length + data.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  const bytes = Buffer.concat([...locals, directory, end]);
  return {
    name: "export.zip",
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };
}
test("CSV handles BOM, normalized headers, escaped quotes, embedded newlines and empty cells", () => {
  assert.deepEqual(
    parseCSV(
      '\uFEFF Name ,Year,Notes\r\n"Movie, \"\"One\"\"",2021,"line 1\nline 2"\r\n\r\nOther,,\rLast,2020',
    ),
    [
      { name: 'Movie, "One"', year: "2021", notes: "line 1\nline 2" },
      { name: "Other", year: "", notes: "" },
      { name: "Last", year: "2020", notes: "" },
    ],
  );
  assert.deepEqual(parseCSV(""), []);
  assert.deepEqual(parseCSV("Name,Year\n"), []);
});
test("backup validation rejects invalid roots and titles", () => {
  for (const value of [
    null,
    {},
    [null],
    [{}],
    [{ title: "  " }],
    [{ title: 42 }],
  ])
    assert.throws(() => validateItems(value), /valid backup/);
  const valid = [{ title: "Dune" }];
  assert.equal(validateItems(valid), valid);
});
test("backup merge deduplicates case and year, preserves existing data and imported fields", () => {
  const items = [{ id: 1, title: "Dune", year: "2021", rating: 9 }];
  const result = mergeItems(items, [
    { title: "DUNE", year: 2021, rating: 2 },
    { title: "Dune", year: "1984", status: "seen", rating: 7 },
    { title: "dune", year: "1984" },
    { title: "Arrival" },
  ]);
  assert.equal(keyOf(items[0]), keyOf({ title: "DUNE", year: 2021 }));
  assert.equal(result.added, 2);
  assert.equal(result.items.length, 3);
  assert.equal(items.length, 1);
  assert.equal(result.items[0].rating, 9);
  assert.equal(result.items[1].status, "seen");
  assert.equal(result.items[1].rating, 7);
  assert.equal(result.items[2].kind, "Film");
  assert.equal(result.items[2].status, "want");
  assert.equal(typeof result.items[2].id, "number");
});
const header = "Name,Year,Letterboxd URI,Rating\n";
test("Letterboxd files sort by precedence, convert ratings, and ignore unrelated CSV", async () => {
  const result = await readLetterboxd([
    csvFile("ratings.csv", header + "Dune,2021,,4.5\nOnly rated,2000,,3"),
    csvFile("diary.csv", header + "Dune,2021,,2\nDune,2021,,0"),
    csvFile("watched.csv", header + "Dune,2021,,"),
    csvFile(
      "watchlist.csv",
      header + " Dune ,2021,https://box/dune,\nFuture,2027,,",
    ),
    csvFile("profile.csv", header + "Ignore,2020,,"),
  ]);
  assert.deepEqual(result, [
    {
      title: "Dune",
      year: "2021",
      link: "https://box/dune",
      status: "seen",
      rating: 9,
    },
    { title: "Future", year: "2027", link: "", status: "want", rating: null },
    { title: "Only rated", year: "2000", link: "", status: "seen", rating: 6 },
  ]);
  await assert.rejects(
    readLetterboxd([csvFile("profile.csv", header)]),
    /Letterboxd data/,
  );
});
for (const method of [0, 8])
  test(`Letterboxd ZIP imports nested CSV using compression ${method}`, async () => {
    const file = zipFile([
      { name: "export/watchlist.csv", text: header + "Future,2027,,", method },
      { name: "export/ratings.CSV", text: header + "Past,1999,,4", method },
      { name: "README.txt", text: "ignored", method },
    ]);
    assert.deepEqual(
      (await unzip(file)).map((entry) => entry.name),
      ["watchlist.csv", "ratings.CSV"],
    );
    const result = await readLetterboxd([file]);
    assert.equal(result.length, 2);
    assert.equal(result[0].status, "want");
    assert.equal(result[1].rating, 8);
  });
test("ZIP rejects corrupt archives and unsupported CSV compression", async () => {
  await assert.rejects(
    unzip({ arrayBuffer: async () => new ArrayBuffer(24) }),
    /zip/,
  );
  await assert.rejects(
    unzip(zipFile([{ name: "ratings.csv", text: header, method: 99 }])),
    /Unsupported ZIP compression/,
  );
});
test("Letterboxd merge preserves personal ratings and links, upgrades seen and fills missing values without mutation", () => {
  const original = [
    {
      title: "Dune",
      year: "2021",
      rating: 10,
      link: "personal",
      status: "want",
    },
    { title: "Arrival", rating: null, status: "seen" },
  ];
  const before = structuredClone(original);
  const result = mergeLetterboxd(original, [
    { title: "DUNE", year: "2021", rating: 8, link: "import", status: "seen" },
    { title: "Arrival", rating: 7, link: "new", status: "want" },
    { title: "New", status: null },
    { title: "NEW", status: "seen", rating: 6 },
  ]);
  assert.deepEqual(original, before);
  assert.equal(result.added, 1);
  assert.equal(result.updated, 3);
  assert.equal(result.items[0].rating, 10);
  assert.equal(result.items[0].link, "personal");
  assert.equal(result.items[0].status, "seen");
  assert.equal(result.items[1].rating, 7);
  assert.equal(result.items[1].link, "new");
  assert.equal(result.items[1].status, "seen");
  assert.equal(result.items[2].kind, "Film");
  assert.equal(result.items[2].rating, 6);
});
