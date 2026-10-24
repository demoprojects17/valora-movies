export function parseCSV(text) {
  const rows = [];
  let row = [],
    f = "",
    q = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(f);
      f = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(f);
      f = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else f += c;
  }
  if (f !== "" || row.length) {
    row.push(f);
    rows.push(row);
  }
  if (!rows.length) return [];
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  return rows.map((r) =>
    Object.fromEntries(head.map((h, i) => [h, r[i] || ""])),
  );
}

export async function unzip(file) {
  const buf = await file.arrayBuffer(),
    v = new DataView(buf),
    u8 = new Uint8Array(buf);
  let e = u8.length - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error("zip");
  const n = v.getUint16(e + 10, true);
  let p = v.getUint32(e + 16, true);
  const out = [];
  for (let k = 0; k < n; k++) {
    const method = v.getUint16(p + 10, true),
      csize = v.getUint32(p + 20, true),
      nl = v.getUint16(p + 28, true),
      xl = v.getUint16(p + 30, true),
      cl = v.getUint16(p + 32, true),
      off = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + xl + cl;
    if (!/\.csv$/i.test(name)) continue;
    const start =
        off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true),
      data = u8.subarray(start, start + csize);
    let text;
    if (method === 0) text = new TextDecoder().decode(data);
    else if (method === 8)
      text = await new Response(
        new Blob([data])
          .stream()
          .pipeThrough(new DecompressionStream("deflate-raw")),
      ).text();
    else throw new Error("Unsupported ZIP compression");
    out.push({ name: name.split("/").pop(), text });
  }
  return out;
}

export const keyOf = (item) =>
  (item.title + "|" + (item.year || "")).toLowerCase();

export function validateItems(list) {
  if (
    !Array.isArray(list) ||
    list.some(
      (item) => !item || typeof item.title !== "string" || !item.title.trim(),
    )
  ) {
    throw new Error("That file isn't a valid backup.");
  }
  return list;
}

export function mergeItems(items, list) {
  validateItems(list);
  const next = items.slice();
  const have = new Set(items.map(keyOf));
  let added = 0;
  for (const item of list) {
    if (have.has(keyOf(item))) continue;
    next.push({
      id: Date.now() + Math.random(),
      status: "want",
      kind: "Film",
      ...item,
    });
    have.add(keyOf(item));
    added++;
  }
  return { items: next, added };
}

export async function readLetterboxd(picked) {
  const files = [];
  for (const file of Array.from(picked)) {
    if (/\.zip$/i.test(file.name)) files.push(...(await unzip(file)));
    else files.push({ name: file.name, text: await file.text() });
  }
  const order = (file) =>
    /watchlist/i.test(file.name)
      ? 0
      : /watched/i.test(file.name)
        ? 1
        : /diary/i.test(file.name)
          ? 2
          : /ratings/i.test(file.name)
            ? 3
            : 9;
  files.sort((a, b) => order(a) - order(b));
  if (!files.some((file) => order(file) < 9))
    throw new Error(
      "Couldn't find Letterboxd data. Choose your Letterboxd ZIP or CSV files.",
    );
  const map = new Map();
  const rate = (value) =>
    parseFloat(value) > 0 ? Math.round(parseFloat(value) * 2) : null;
  for (const file of files) {
    const rank = order(file);
    if (rank === 9) continue;
    for (const row of parseCSV(file.text)) {
      const title = (row.name || "").trim();
      if (!title) continue;
      const year = (row.year || "").trim();
      const key = keyOf({ title, year });
      if (!map.has(key))
        map.set(key, {
          title,
          year,
          link: row["letterboxd uri"] || "",
          status: null,
          rating: null,
        });
      const item = map.get(key);
      if (rank === 0) {
        if (!item.status) item.status = "want";
      } else if (rank === 1) item.status = "seen";
      else if (rank === 2) {
        item.status = "seen";
        item.rating = rate(row.rating) || item.rating;
      } else {
        item.rating = rate(row.rating) || item.rating;
        if (!item.status) item.status = "seen";
      }
    }
  }
  return [...map.values()];
}

export function mergeLetterboxd(items, imported) {
  const next = items.map((item) => ({ ...item }));
  const byKey = new Map(next.map((item) => [keyOf(item), item]));
  let added = 0,
    updated = 0;
  for (const item of imported) {
    const existing = byKey.get(keyOf(item));
    if (existing) {
      if (item.status === "seen") existing.status = "seen";
      if (item.rating && !existing.rating) existing.rating = item.rating;
      if (!existing.link && item.link) existing.link = item.link;
      updated++;
    } else {
      const entry = {
        id: Date.now() + Math.random(),
        ...item,
        kind: "Film",
        status: item.status || "seen",
      };
      next.push(entry);
      byKey.set(keyOf(item), entry);
      added++;
    }
  }
  return { items: next, added, updated };
}
