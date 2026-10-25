"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import SettingsOverview from "./SettingsOverview";
import ProfileAvatar from "./ProfileAvatar";
import AvatarCropper from "./AvatarCropper";
import { normalizeAvatar } from "../lib/avatar";

export default function CabinetProfile({
  showSettings = false,
  onUpdate,
  user,
  items,
  lang,
  syncState,
  syncLabel,
  sync,
  updateProfile,
  uploadAvatar,
  onLogout,
  exportBackup,
  onImport,
  onLetterboxd,
  onLanguage,
  onSignIn,
  onReset,
}) {
  const w = (en, ka) => (lang === "ka" ? ka : en);
  const name =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    w("Local collection", "ადგილობრივი კოლექცია");
  const [edit, setEdit] = useState(false),
    [draft, setDraft] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const editDialog = useRef(null);
  const photoInput = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [cropFile, setCropFile] = useState(null);
  useEffect(() => setCropFile(null), [user?.id]);
  useEffect(() => {
    if (edit && editDialog.current) {
      editDialog.current.showModal();
      editDialog.current.querySelector("input")?.focus();
    }
  }, [edit]);
  const rated = items.filter((i) => i.rating);
  const average = rated.length
    ? (rated.reduce((n, i) => n + Number(i.rating), 0) / rated.length).toFixed(
        1,
      )
    : "–";
  const stats = [
    [items.length, w("Saved titles", "შენახული სათაური"), "bookmark"],
    [
      items.filter((i) => i.status === "seen").length,
      w("Watched", "ნანახი"),
      "film",
    ],
    [
      items.filter((i) => i.status === "watching").length,
      w("Watching", "ვუყურებ"),
      "tv",
    ],
    [average, w("Average rating", "საშუალო შეფასება"), "spark"],
  ];
  const actions = (
    <>
      <button className="link" onClick={onImport}>
        {w("Import backup", "სარეზერვო იმპორტი")}
      </button>
      <button className="link" onClick={onLetterboxd}>
        {w("Import", "იმპორტი")} <Icon name="plus" size={13} />
      </button>
    </>
  );
  return (
    <section
      id="profileDlg"
      className={showSettings ? "settings-profile" : undefined}
      aria-label={w("Personal cabinet", "პირადი კაბინეტი")}
    >
      {!showSettings && <div className="p-cover">
        <div className="profile-art" />
        <span className="p-cover-caption">
          {w("Your personal story space", "შენი ამბების პირადი სივრცე")}
        </span>
      </div>}
      <div className={showSettings ? "c-hero" : undefined}><div className={showSettings ? "c-hero-copy" : undefined}>
      {showSettings && <span className="c-eyebrow">{w("Your personal movie journal", "შენი პირადი კინოჟურნალი")}</span>}
      <div className="p-identity">
        <div className="profile-photo-control">
          <button
            type="button"
            className="p-avatar"
            disabled={!user || photoBusy}
            aria-label={w("Change profile photo", "პროფილის ფოტოს შეცვლა")}
            onClick={() => photoInput.current?.click()}
          >
            <ProfileAvatar
              user={user}
              fallback={name.charAt(0).toUpperCase()}
            />
          </button>
          <input
            ref={photoInput}
            id="avatarFile"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,image/heic,image/heif,.heic,.heif"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setPhotoError("");
              try {
                setPhotoBusy(true);
                setCropFile(await normalizeAvatar(file));
              } catch (error) {
                setPhotoError(error.message);
              } finally {
                setPhotoBusy(false);
              }
            }}
          />
          {user && (
            <button
              type="button"
              className="link"
              disabled={photoBusy}
              onClick={() => photoInput.current?.click()}
            >
              {photoBusy
                ? w("Processing photo…", "ფოტო მუშავდება…")
                : w("Change photo", "ფოტოს შეცვლა")}
            </button>
          )}
        </div>
        <div className="p-name">
          <h2>{name}</h2>
          <p id="profEmail">
            {user?.email ||
              w("Stored on this device", "შენახულია ამ მოწყობილობაზე")}
            {user?.created_at &&
              ` · ${w("Member since", "წევრი")} ${new Date(user.created_at).getFullYear()}`}
          </p>
        </div>
        <div className="p-badge">
          <Icon name="check" size={13} />
          {w("Personal collection", "პირადი კოლექცია")}
        </div>
      </div>
      {showSettings && <><p className="c-hero-intro">{w("Good stories stay with you. Keep them all in one place.", "კარგი ისტორიები გრჩება. შეინახე ყველა მათგანი ერთ სივრცეში.")}</p><button className="c-edit" onClick={() => { if (!user) return onSignIn(); setDraft(name); setError(""); setEdit(true); }}><Icon name="settings" size={15}/>{w("Edit profile", "პროფილის რედაქტირება")}</button><span className="c-member-since">VELORA · {user?.created_at ? new Date(user.created_at).getFullYear() : w("LOCAL COLLECTION", "ადგილობრივი კოლექცია")}</span></>}
      </div>{showSettings && <div className="c-hero-art" aria-hidden="true">{["resident-evil.jpg", "animals.jpg", "sasaki.jpg"].map((poster, index) => <div key={poster} className={`c-poster c-poster-${["one","two","three"][index]}`}><img src={`/assets/releases/${poster}`} alt=""/></div>)}</div>}</div>
      {photoError && (
        <p className="avatar-error" role="alert">
          {photoError}
        </p>
      )}
      <div className="stats profile-stats">
        {stats.map(([count, label, icon]) => (
          <div className="stat" key={icon}>
            <div className="profile-stat-icon">
              <Icon name={icon} size={18} />
            </div>
            <div>
              <b>{count}</b>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </div>
      {showSettings && (
        <>
          <SettingsOverview items={items} lang={lang} onUpdate={onUpdate}/>
          <div className="c-settings-heading" id="cabinet-settings"><span className="c-eyebrow">{w("Everything under your control", "ყველაფერი შენს კონტროლშია")}</span><h2>{w("Account and settings", "ანგარიში და პარამეტრები")}</h2></div>
          <div className="p-columns">
            <div>
              <section className="p-panel">
                <div className="p-panel-head">
                  <h2>
                    <Icon name="settings" size={17} />
                    {w("Personal information", "პირადი ინფორმაცია")}
                  </h2>
                  <button
                    className="link"
                    disabled={!user}
                    onClick={() => {
                      setDraft(name);
                      setError("");
                      setEdit(true);
                    }}
                  >
                    {w("Edit", "რედაქტირება")} <Icon name="arrow" size={13} />
                  </button>
                </div>
                <div className="p-row">
                  <span>{w("Name", "სახელი")}</span>
                  <strong>{name}</strong>
                </div>
                <div className="p-row">
                  <span>{w("Email", "ელფოსტა")}</span>
                  <strong>{user?.email || "–"}</strong>
                </div>
                <div className="p-row">
                  <span>{w("Password", "პაროლი")}</span>
                  <button className="link" disabled={!user} onClick={onReset}>
                    {w("Reset password", "პაროლის აღდგენა")}{" "}
                    <Icon name="arrow" size={13} />
                  </button>
                </div>
                {!user && (
                  <button className="primary" onClick={onSignIn}>
                    {w(
                      "Sign in to sync your library",
                      "შედი ანგარიშში ბიბლიოთეკის სინქრონიზაციისთვის",
                    )}
                  </button>
                )}
              </section>
              <section className="p-panel">
                <div className="p-panel-head">
                  <h2>
                    <Icon name="grid" size={17} />
                    {w("Settings", "პარამეტრები")}
                  </h2>
                </div>
                <div className="p-row">
                  <div>
                    {w("Interface language", "ინტერფეისის ენა")}
                    <p>
                      {w(
                        "Choose your preferred language",
                        "აირჩიე შენთვის მოსახერხებელი ენა",
                      )}
                    </p>
                  </div>
                  <div
                    className="p-language"
                    role="group"
                    aria-label={w("Interface language", "ინტერფეისის ენა")}
                  >
                    {["ka", "en"].map((l) => (
                      <button
                        key={l}
                        aria-pressed={lang === l}
                        className={lang === l ? "active" : ""}
                        onClick={() => onLanguage(l)}
                      >
                        {l === "ka" ? "ქარ" : "EN"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-row">
                  <div>
                    {w("Backup", "სარეზერვო ასლი")}
                    <p>
                      {w(
                        "Download your collection as JSON",
                        "ჩამოტვირთე შენი კოლექცია JSON ფორმატში",
                      )}
                    </p>
                  </div>
                  <button className="profile-button" onClick={exportBackup}>
                    {w("Export", "ექსპორტი")}
                    <Icon name="arrow" size={13} />
                  </button>
                </div>
                <div className="p-row">
                  <span>{w("Import collections", "კოლექციის იმპორტი")}</span>
                  <div className="profile-imports">{actions}</div>
                </div>
              </section>
            </div>
            <div>
              <section className="p-panel">
                <div className="p-panel-head">
                  <h2>
                    <Icon name="check" size={17} />
                    {w("Synchronization", "სინქრონიზაცია")}
                  </h2>
                  <span
                    id="profStatus"
                    className={`p-sync-status ${syncState === "err" ? "error" : ""}`}
                  >
                    {syncLabel}
                  </span>
                </div>
                <p className="p-sync-text">
                  {w(
                    "Your movies, ratings and episode progress stay with you across devices.",
                    "შენი ბიბლიოთეკა შენთანაა — ფილმები, შეფასებები და სერიების პროგრესი ყველა მოწყობილობაზე.",
                  )}
                </p>
                <div className="p-row">
                  <span>{w("Saved titles", "შენახული სათაურები")}</span>
                  <strong id="profCount">{items.length}</strong>
                </div>
                <div className="p-device">
                  <strong>
                    {w(
                      "Continue on another device",
                      "გააგრძელე სხვა მოწყობილობაზე",
                    )}
                  </strong>
                  <p>
                    {w(
                      "Open Velora on your phone or another browser and sign in with the same email.",
                      "გახსენი Velora ტელეფონზე ან სხვა ბრაუზერში და შედი იმავე ელფოსტით. შენი კოლექცია ავტომატურად გამოჩნდება.",
                    )}
                  </p>
                </div>
                <button
                  id="profSyncBtn"
                  className="profile-button"
                  style={{ width: "100%" }}
                  disabled={!user || syncState === "saving"}
                  onClick={sync}
                >
                  <Icon name="check" size={14} />
                  {w("Sync again", "ხელახლა სინქრონიზაცია")}
                </button>
              </section>
              <section className="p-panel">
                <div className="p-panel-head">
                  <h2>
                    <Icon name="clock" size={17} />
                    {w("Recently added", "ბოლოს დამატებული")}
                  </h2>
                </div>
                {items
                  .slice(-3)
                  .reverse()
                  .map((i) => (
                    <div className="p-activity" key={i.id}>
                      <div className="p-thumb">
                        {i.poster ? (
                          <img src={i.poster} alt="" loading="lazy" />
                        ) : (
                          <Icon name="film" />
                        )}
                      </div>
                      <div className="p-activity-title">
                        {i.title}
                        <p>
                          {i.kind === "Film"
                            ? w("Movie", "ფილმი")
                            : w("Season", "სეზონი") +
                              " " +
                              (i.season || 1) +
                              " · " +
                              w("Episode", "სერია") +
                              " " +
                              (i.episode ?? 1)}
                          {i.rating ? ` · ★ ${i.rating}/10` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                {!items.length && (
                  <p className="p-sync-text">
                    {w(
                      "Your collection is empty.",
                      "შენი კოლექცია ჯერ ცარიელია.",
                    )}
                  </p>
                )}
              </section>
            </div>
          </div>
          <div className="p-account-footer">
            <p>
              {w("Your collection is personal.", "შენი კოლექცია პერსონალურია.")}
            </p>
            <button
              id="profLogoutBtn"
              disabled={!user}
              className="profile-button p-logout"
              onClick={onLogout}
            >
              {w("Log out", "ანგარიშიდან გამოსვლა")}
              <Icon name="arrow" size={14} />
            </button>
          </div>
        </>
      )}
      {cropFile && (
        <AvatarCropper
          file={cropFile}
          lang={lang}
          onClose={() => setCropFile(null)}
          onSave={async (file, crop) => {
            setPhotoBusy(true);
            try {
              return await uploadAvatar(file, crop);
            } finally {
              setPhotoBusy(false);
            }
          }}
        />
      )}
      {edit && (
        <dialog
          ref={editDialog}
          onCancel={(e) => {
            if (busy) e.preventDefault();
            else setEdit(false);
          }}
          className="profile-edit"
          aria-label={w("Edit profile", "პროფილის რედაქტირება")}
        >
          <button
            className="link"
            disabled={busy}
            onClick={() => setEdit(false)}
          >
            {w("Close", "დახურვა")}
          </button>
          <h2>{w("Edit profile", "პროფილის რედაქტირება")}</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                if (await updateProfile(draft)) setEdit(false);
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              {w("Full name", "სახელი და გვარი")}
              <input
                autoFocus
                required
                maxLength={60}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </label>
            <p role="alert">{error}</p>
            <button className="primary" disabled={busy}>
              {busy
                ? w("Saving…", "ინახება…")
                : w("Save changes", "ცვლილებების შენახვა")}
            </button>
          </form>
        </dialog>
      )}
    </section>
  );
}
