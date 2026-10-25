"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  mergeItems,
  mergeLetterboxd,
  readLetterboxd,
  validateItems,
} from "./imports.js";
import { searchTitles } from "./media.js";
import { prepareAvatar, prepareCover } from "./avatar.js";

const KEY = "watchlist.v1",
  TKEY = "velora.tmdbKey",
  DIRTY = "velora.dirty";
let browserClient;
function getClient() {
  if (typeof window === "undefined") return null;
  if (!browserClient)
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        "https://kychahlyhrqvzquxpolz.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        "sb_publishable_nunwyDZ868G4tbiPGLDXPA_vpEkrOgs",
    );
  return browserClient;
}
function read(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {}
}

function authErrorMessage(error) {
  const message = error.message || "";
  const lower = message.toLowerCase();
  if (lower.includes("email not confirmed"))
    return "ელფოსტა ჯერ არ არის დადასტურებული. შეამოწმეთ Inbox / Spam და გახსენით დადასტურების ბმული.";
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials")
  )
    return "არასწორი ელფოსტა ან პაროლი. გადაამოწმეთ მონაცემები და ელფოსტის დადასტურება.";
  if (lower.includes("already registered") || lower.includes("already in use"))
    return "ეს ელფოსტა უკვე დარეგისტრირებულია. გადადით შესვლის ჩანართზე.";
  if (
    lower.includes("password should be at least") ||
    lower.includes("at least 6 characters")
  )
    return "პაროლი უნდა შედგებოდეს მინიმუმ 6 სიმბოლოსგან.";
  if (lower.includes("rate limit") || lower.includes("too many requests"))
    return "ძალიან ბევრი მცდელობა. მოიცადეთ რამდენიმე წუთი და სცადეთ ხელახლა.";
  return message || "ავტორიზაცია ვერ მოხერხდა.";
}

export function useVelora() {
  const [items, setItems] = useState([]),
    [ready, setReady] = useState(false);
  const [tmdbKey, setKey] = useState(""),
    [user, setUser] = useState(null);
  const [syncState, setSyncState] = useState("offline");
  const [authMode, setMode] = useState("signin"),
    [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState(""),
    [authBusy, setAuthBusy] = useState(false);
  const [posterProgress, setPosterProgress] = useState(null),
    [toast, setToast] = useState("");
  const ref = useRef({
    alive: false,
    epoch: 0,
    revision: 0,
    items: [],
    key: "",
    user: null,
    client: null,
    dirty: false,
    cloudReady: false,
    timer: null,
    loading: null,
    pushing: null,
    posters: false,
    authRequest: 0,
  });
  const current = (token) => ref.current.alive && ref.current.epoch === token;
  function persist() {
    const s = ref.current;
    write(KEY, JSON.stringify(s.items));
    write(TKEY, s.key || null);
  }
  function publish() {
    setItems(ref.current.items);
    setKey(ref.current.key);
    persist();
  }
  function schedule() {
    const s = ref.current;
    clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      s.timer = null;
      void sync();
    }, 800);
  }
  function save() {
    const s = ref.current;
    s.revision++;
    publish();
    if (s.user && s.client) {
      s.dirty = true;
      write(DIRTY, "1");
      setSyncState("saving");
      schedule();
    }
  }
  async function push() {
    const s = ref.current;
    if (!s.alive || !s.user || !s.client || !s.cloudReady) return false;
    if (s.pushing) return s.pushing;
    clearTimeout(s.timer);
    s.timer = null;
    const token = s.epoch,
      revision = s.revision;
    setSyncState("saving");
    const work = (async () => {
      try {
        const { error } = await s.client.from("lists").upsert({
          user_id: s.user.id,
          data: { items: s.items, tmdbKey: s.key },
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        if (!current(token)) return false;
        if (revision === s.revision) {
          s.dirty = false;
          write(DIRTY, null);
          setSyncState("synced");
        } else {
          schedule();
          setSyncState("saving");
        }
        return true;
      } catch {
        if (current(token)) setSyncState("err");
        return false;
      } finally {
        if (current(token)) s.pushing = null;
      }
    })();
    s.pushing = work;
    return work;
  }
  async function refreshProfile() {
    const s = ref.current,
      token = s.epoch,
      snapshot = s.user;
    if (!snapshot || !s.client?.auth.getUser) return;
    try {
      const { data, error } = await s.client.auth.getUser();
      if (
        !error &&
        current(token) &&
        s.user === snapshot &&
        data?.user?.id === snapshot.id
      ) {
        s.user = data.user;
        setUser(data.user);
      }
    } catch {}
  }
  async function load() {
    const s = ref.current;
    if (!s.alive || !s.user || !s.client) return false;
    if (s.loading) return s.loading;
    if (s.pushing) return s.pushing;
    const token = s.epoch,
      id = s.user.id;
    void refreshProfile();
    setSyncState("saving");
    const work = (async () => {
      try {
        const { data, error } = await s.client
          .from("lists")
          .select("data")
          .eq("user_id", id)
          .maybeSingle();
        if (error) throw error;
        if (!current(token)) return false;
        const cloud = data?.data;
        const cloudItems = Array.isArray(cloud?.items)
          ? validateItems(cloud.items)
          : null;
        let needPush = false;
        if (cloudItems === null)
          needPush = s.items.length > 0 || !!s.key || s.dirty;
        else if (
          s.dirty ||
          read(DIRTY) === "1" ||
          read(`velora.synced.${id}`) !== "1"
        ) {
          s.items = mergeItems(s.items, cloudItems).items;
          needPush = true;
        } else s.items = cloudItems.slice();
        if (cloud?.tmdbKey && typeof cloud.tmdbKey === "string")
          s.key = cloud.tmdbKey;
        else if (s.key) needPush = true;
        s.cloudReady = true;
        write(`velora.synced.${id}`, "1");
        publish();
        if (needPush) {
          s.dirty = true;
          write(DIRTY, "1");
          return await push();
        }
        setSyncState("synced");
        return true;
      } catch {
        if (current(token)) setSyncState("err");
        return false;
      } finally {
        if (current(token)) s.loading = null;
      }
    })();
    s.loading = work;
    return work;
  }
  async function sync() {
    const s = ref.current;
    if (s.loading) return s.loading;
    if (!s.cloudReady) return load();
    return s.dirty || read(DIRTY) === "1" ? push() : load();
  }
  function acceptUser(next) {
    const s = ref.current;
    if (!s.alive) return;
    const changed = s.user?.id !== next?.id;
    if (changed) {
      const previous = s.user;
      s.epoch++;
      clearTimeout(s.timer);
      s.timer = null;
      s.loading = null;
      s.pushing = null;
      s.cloudReady = false;
      s.posters = false;
      setPosterProgress(null);
      if (previous) {
        s.items = [];
        s.dirty = false;
        write(KEY, null);
        write(DIRTY, null);
        setItems([]);
      }
    }
    s.user = next;
    setUser(next);
    if (!next) setSyncState("offline");
    else if (changed) {
      const token = s.epoch;
      // Supabase callbacks must finish before starting another auth-dependent request.
      queueMicrotask(() => {
        if (current(token)) void load();
      });
    }
  }
  useEffect(() => {
    const s = ref.current;
    s.alive = true;
    s.epoch++;
    try {
      s.items = validateItems(JSON.parse(read(KEY) || "[]"));
    } catch {
      s.items = [];
    }
    s.key = read(TKEY) || "";
    s.dirty = read(DIRTY) === "1";
    setItems(s.items);
    setKey(s.key);
    setReady(true);
    if (window.location.href.includes("type=recovery")) setMode("update");
    let subscription;
    try {
      s.client = getClient();
      let receivedEvent = false;
      const token = s.epoch;
      subscription = s.client.auth.onAuthStateChange((event, session) => {
        if (!s.alive) return;
        receivedEvent = true;
        if (event === "PASSWORD_RECOVERY") setMode("update");
        acceptUser(session?.user || null);
      }).data.subscription;
      s.client.auth
        .getSession()
        .then(({ data, error }) => {
          if (!current(token) || receivedEvent) return;
          if (error) setAuthError(error.message);
          else acceptUser(data.session?.user || null);
        })
        .catch((error) => {
          if (current(token)) setAuthError(error.message);
        });
    } catch (error) {
      setAuthError(error.message);
    }
    const online = () => {
      void sync();
    };
    const visible = () => {
      if (document.visibilityState === "visible" && !s.timer && !s.pushing)
        void sync();
    };
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", visible);
    return () => {
      s.alive = false;
      s.epoch++;
      s.authRequest++;
      clearTimeout(s.timer);
      s.timer = null;
      s.loading = null;
      s.pushing = null;
      s.user = null;
      s.cloudReady = false;
      s.posters = false;
      subscription?.unsubscribe();
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", visible);
    };
    // All async work reads the mutable session snapshot, not render closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  function setAuthMode(mode) {
    setMode(mode);
    setAuthError("");
    setAuthMessage("");
  }
  async function authenticate(mode, email = "", password = "") {
    const s = ref.current,
      request = ++s.authRequest,
      startEpoch = s.epoch;
    if (!s.client || !s.alive) return false;
    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");
    try {
      let result;
      if (mode === "signin")
        result = await s.client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
      else if (mode === "signup")
        result = await s.client.auth.signUp({ email: email.trim(), password });
      else if (mode === "reset")
        result = await s.client.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.href.split("#")[0],
        });
      else if (mode === "update")
        result = await s.client.auth.updateUser({ password });
      else throw new Error("Unknown authentication mode");
      if (!s.alive || request !== s.authRequest) return false;
      if (result.error) throw result.error;
      const next =
        result.data?.session?.user ||
        (mode === "signin" ? result.data?.user : null);
      if (s.epoch !== startEpoch && s.user?.id !== next?.id) return false;
      if (next) acceptUser(next);
      setAuthMessage(
        mode === "reset"
          ? "აღდგენის ბმული გაგზავნილია. შეამოწმეთ ელფოსტა (Inbox / Spam)."
          : mode === "update"
            ? "პაროლი წარმატებით განახლდა!"
            : mode === "signup" && !result.data?.session
              ? "რეგისტრაცია მიღებულია! შესვლამდე დაადასტურეთ ელფოსტაზე გამოგზავნილი ბმული."
              : "წარმატებით შეხვედით!",
      );
      return true;
    } catch (error) {
      if (s.alive && request === s.authRequest && s.epoch === startEpoch)
        setAuthError(authErrorMessage(error));
      return false;
    } finally {
      if (s.alive && request === s.authRequest) setAuthBusy(false);
    }
  }
  async function updateProfile(name) {
    const s = ref.current,
      token = s.epoch;
    const displayName = name.trim();
    if (!s.user || !s.client)
      throw new Error("შედი ანგარიშში პროფილის შესაცვლელად.");
    if (!displayName || displayName.length > 60)
      throw new Error("მიუთითე სახელი, მაქსიმუმ 60 სიმბოლო.");
    const { data, error } = await s.client.auth.updateUser({
      data: { display_name: displayName },
    });
    if (error) throw error;
    if (!current(token)) return false;
    if (data?.user) {
      s.user = data.user;
      setUser(data.user);
    }
    return true;
  }
  async function uploadAvatar(file, crop, kind = "avatar") {
    const s = ref.current,
      token = s.epoch;
    if (!s.user || !s.client)
      throw new Error("ფოტოს ასატვირთად შედი ანგარიშში.");
    const userId = s.user.id;
    const previous = s.user.user_metadata?.[`${kind}_path`];
    const blob = kind === "cover" ? await prepareCover(file, crop) : await prepareAvatar(file, crop);
    if (!current(token)) return false;
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const bucket = s.client.storage.from("avatars");
    const { error: uploadError } = await bucket.upload(path, blob, {
      contentType: blob.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) {
      if (/bucket.*not found|not found.*bucket/i.test(uploadError.message))
        throw new Error(
          "ფოტოების საცავი ჯერ არ არის გამართული. საჭიროა Supabase-ში avatars საცავის ჩართვა.",
        );
      if (/row.level|policy|unauthorized/i.test(uploadError.message))
        throw new Error(
          "ფოტოს შენახვის უფლება არ არის გამართული. საჭიროა avatars საცავის წვდომის წესების განახლება.",
        );
      throw new Error(`ფოტოს ატვირთვა ვერ მოხერხდა: ${uploadError.message}`);
    }
    if (!current(token)) return false;
    const { data: image } = bucket.getPublicUrl(path);
    const { data, error } = await s.client.auth.updateUser({
      data: { [`${kind}_url`]: image.publicUrl, [`${kind}_path`]: path },
    });
    if (error) {
      await bucket.remove([path]);
      throw error;
    }
    if (!current(token)) return false;
    if (data?.user) {
      s.user = data.user;
      setUser(data.user);
    }
    if (
      typeof previous === "string" &&
      previous.startsWith(`${userId}/`) &&
      previous !== path
    )
      await bucket.remove([previous]).catch(() => {});
    return true;
  }
  async function logout() {
    const s = ref.current,
      token = s.epoch;
    if (!s.user || !s.client) return false;
    if (s.dirty || s.timer || s.pushing) {
      await sync();
      if (!current(token)) return false;
      if (
        s.dirty &&
        !window.confirm(
          "ცვლილებები ღრუბელში ვერ შეინახა. მაინც გამოხვიდე? ამ მოწყობილობაზე შენახული სია წაიშლება.",
        )
      )
        return false;
    }
    s.authRequest++;
    setAuthBusy(false);
    const { error } = await s.client.auth.signOut();
    if (error) {
      if (current(token)) setAuthError(error.message);
      return false;
    }
    if (current(token)) acceptUser(null);
    return true;
  }
  function addItems(list) {
    const result = mergeItems(ref.current.items, list);
    ref.current.items = result.items;
    save();
    return result.added;
  }
  function updateItem(id, patch) {
    ref.current.items = ref.current.items.map((item) =>
      item.id === id ? { ...item, ...patch, id: item.id } : item,
    );
    save();
  }
  function removeItem(id) {
    ref.current.items = ref.current.items.filter((item) => item.id !== id);
    save();
  }
  function setTmdbKey(value) {
    ref.current.key = value.trim();
    save();
  }
  async function importBackup(file) {
    const token = ref.current.epoch;
    const list = validateItems(JSON.parse(await file.text()));
    return current(token) ? addItems(list) : 0;
  }
  async function importLetterboxd(files) {
    const token = ref.current.epoch;
    const imported = await readLetterboxd(files);
    if (!current(token)) return { added: 0, updated: 0 };
    const result = mergeLetterboxd(ref.current.items, imported);
    ref.current.items = result.items;
    save();
    return { added: result.added, updated: result.updated };
  }
  function exportBackup() {
    if (typeof document === "undefined") return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(ref.current.items, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "velora-watchlist-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  async function findPosters() {
    const s = ref.current,
      token = s.epoch,
      key = undefined;
    if (s.posters) return;
    const todo = s.items.filter((item) => !item.poster);
    if (!todo.length) {
      setToast("ყველა სათაურს უკვე აქვს პოსტერი.");
      return;
    }
    s.posters = true;
    try {
      for (let n = 0; n < todo.length; n++) {
        if (!current(token) || s.key !== key) return;
        setPosterProgress({ current: n + 1, total: todo.length });
        const item = todo[n];
        try {
          const results = await searchTitles(item.title, key);
          if (!current(token) || s.key !== key) return;
          const pick =
            results.find(
              (result) =>
                item.year && result.year === String(item.year) && result.poster,
            ) ||
            results.find(
              (result) => result.kind === item.kind && result.poster,
            ) ||
            results.find((result) => result.poster);
          const existing = s.items.find((entry) => entry.id === item.id);
          if (pick && existing && !existing.poster) {
            const { poster, tmdbId, media, overview, tmdbRating } = pick;
            updateItem(item.id, {
              poster,
              tmdbId,
              media,
              overview,
              tmdbRating,
              year: existing.year || pick.year,
            });
          }
        } catch (error) {
          if (error.message === "key") {
            if (current(token)) setToast("TMDB გასაღები არ მუშაობს.");
            break;
          }
        }
      }
    } finally {
      if (current(token)) {
        s.posters = false;
        setPosterProgress(null);
      }
    }
  }
  return {
    items,
    ready,
    tmdbKey,
    setTmdbKey,
    user,
    syncState,
    authMode,
    setAuthMode,
    authError,
    authMessage,
    authBusy,
    authenticate,
    updateProfile,
    uploadAvatar,
    uploadCover: (file, crop) => uploadAvatar(file, crop, "cover"),
    logout,
    sync,
    addItems,
    updateItem,
    removeItem,
    importBackup,
    importLetterboxd,
    exportBackup,
    findPosters,
    posterProgress,
    toast,
    setToast,
  };
}
