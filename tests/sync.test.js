import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";

let effects,
  states,
  session,
  callback,
  cloud,
  writes,
  selectResult,
  upsertResult;
const storage = new Map();
const client = {
  auth: {
    getSession: async () => ({ data: { session } }),
    onAuthStateChange: (fn) => {
      callback = fn;
      return { data: { subscription: { unsubscribe() {} } } };
    },
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: () =>
          selectResult
            ? selectResult()
            : Promise.resolve({ data: { data: cloud } }),
      }),
    }),
    upsert: (value) => {
      writes.push(value);
      return upsertResult ? upsertResult() : Promise.resolve({ error: null });
    },
  }),
};

mock.module("react", {
  namedExports: {
    useState: (initial) => {
      const cell = { value: initial };
      states.push(cell);
      return [
        initial,
        (value) => {
          cell.value = value;
        },
      ];
    },
    useRef: (current) => ({ current }),
    useEffect: (effect) => {
      effects.push(effect);
    },
  },
});
mock.module("@supabase/supabase-js", {
  namedExports: { createClient: () => client },
});
const { useVelora } = await import("../lib/useVelora.js");
let cleanup;
const tick = async () => {
  for (let n = 0; n < 12; n++) await Promise.resolve();
};
function mount({
  local = [],
  remote = [],
  dirty = false,
  known = true,
  loggedIn = true,
} = {}) {
  effects = [];
  states = [];
  writes = [];
  storage.clear();
  selectResult = null;
  upsertResult = null;
  cloud = { items: remote, tmdbKey: "" };
  session = loggedIn ? { user: { id: "u1" } } : null;
  storage.set("watchlist.v1", JSON.stringify(local));
  if (known) storage.set("velora.synced.u1", "1");
  if (dirty) storage.set("velora.dirty", "1");
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    location: { href: "https://velora.test/" },
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.document = { addEventListener() {}, removeEventListener() {} };
  const api = useVelora();
  cleanup = effects[0]();
  return api;
}
afterEach(() => {
  cleanup?.();
  cleanup = null;
  delete globalThis.window;
  delete globalThis.document;
});
const film = { id: 1, title: "Dune", year: "2021" };
test("known clean device accepts cloud deletion instead of reuploading local titles", async () => {
  mount({ local: [film] });
  await tick();
  assert.deepEqual(JSON.parse(storage.get("watchlist.v1")), []);
  assert.equal(writes.length, 0);
});
test("first login merges local and cloud and uploads original schema", async () => {
  mount({ local: [film], remote: [{ id: 2, title: "Alien" }], known: false });
  await tick();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].user_id, "u1");
  assert.equal(writes[0].data.items.length, 2);
  assert.equal(storage.has("velora.dirty"), false);
});
test("failed upload retains dirty marker and error status", async () => {
  const api = mount();
  await tick();
  upsertResult = async () => ({ error: new Error("offline") });
  api.addItems([film]);
  await api.sync();
  assert.equal(storage.get("velora.dirty"), "1");
  assert.equal(states[4].value, "err");
});
test("edit during upload remains dirty until a later upload", async () => {
  const api = mount();
  await tick();
  let finish;
  upsertResult = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  api.addItems([film]);
  const pending = api.sync();
  await tick();
  api.updateItem(1, { rating: 9 });
  finish({ error: null });
  await pending;
  assert.equal(storage.get("velora.dirty"), "1");
  upsertResult = null;
  await api.sync();
  assert.equal(storage.has("velora.dirty"), false);
  assert.equal(writes.at(-1).data.items[0].rating, 9);
});
test("late cloud response cannot restore data after sign out", async () => {
  const api = mount();
  await tick();
  let finish;
  selectResult = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const pending = api.sync();
  await tick();
  callback("SIGNED_OUT", null);
  finish({ data: { data: { items: [film] } } });
  await pending;
  assert.equal(storage.has("watchlist.v1"), false);
  assert.deepEqual(states[0].value, []);
});
test("unmounted import cannot mutate local storage", async () => {
  const api = mount({ loggedIn: false });
  await tick();
  let finish;
  const pending = api.importBackup({
    text: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  cleanup();
  finish(JSON.stringify([film]));
  await pending;
  assert.deepEqual(JSON.parse(storage.get("watchlist.v1")), []);
});
test("hook render is safe without browser globals", () => {
  effects = [];
  states = [];
  delete globalThis.window;
  delete globalThis.document;
  assert.equal(useVelora().ready, false);
});
test("late old-account load cannot overwrite a new account", async () => {
  const api = mount();
  await tick();
  let finish;
  selectResult = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const pending = api.sync();
  await tick();
  selectResult = null;
  cloud = { items: [{ id: 3, title: "New account" }] };
  callback("SIGNED_IN", { user: { id: "u2" } });
  await tick();
  finish({ data: { data: { items: [film] } } });
  await pending;
  assert.deepEqual(JSON.parse(storage.get("watchlist.v1")), [
    { id: 3, status: "want", kind: "Film", title: "New account" },
  ]);
});

test("profile name updates account metadata without changing the library", async () => {
  const api = mount({ local: [film], remote: [film] });
  await tick();
  let sent;
  client.auth.updateUser = async (attributes) => {
    sent = attributes;
    return {
      data: { user: { id: "u1", user_metadata: attributes.data } },
      error: null,
    };
  };
  assert.equal(await api.updateProfile("  New Name  "), true);
  assert.deepEqual(sent, { data: { display_name: "New Name" } });
  assert.equal(states[3].value.user_metadata.display_name, "New Name");
  assert.deepEqual(JSON.parse(storage.get("watchlist.v1")), [film]);
  assert.equal(writes.length, 0);
});

test("profile edit rejects guest accounts and blank names", async () => {
  const api = mount({ loggedIn: false });
  await tick();
  await assert.rejects(api.updateProfile("Guest"));
  callback("SIGNED_IN", { user: { id: "u1" } });
  await tick();
  await assert.rejects(api.updateProfile("   "));
});
