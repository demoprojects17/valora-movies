import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAvatar, getAvatarCrop } from "../lib/avatar.js";
test("avatars accept supported photos within upload limit", () => {
  for (const type of [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/avif",
    "image/heic",
    "image/heif",
  ])
    assert.doesNotThrow(() => validateAvatar({ type, size: 1024 }));
});
test("avatars reject unsupported, empty and oversized files", () => {
  for (const file of [
    null,
    { type: "image/svg+xml", size: 20 },
    { type: "image/png", size: 0 },
    { type: "image/jpeg", size: 50 * 1024 * 1024 + 1 },
  ])
    assert.throws(() => validateAvatar(file));
});

test("crop keeps zoomed and dragged selection within image bounds", () => {
  assert.deepEqual(getAvatarCrop(2000, 1000, 1, 0, 0), {
    x: 500,
    y: 0,
    size: 1000,
  });
  assert.deepEqual(getAvatarCrop(2000, 1000, 2, 0, 0), {
    x: 750,
    y: 250,
    size: 500,
  });
  assert.deepEqual(getAvatarCrop(2000, 1000, 2, 99999, -99999), {
    x: 0,
    y: 500,
    size: 500,
  });
  assert.throws(() => getAvatarCrop(0, 100, 1, 0, 0));
  assert.doesNotThrow(() =>
    validateAvatar({ type: "image/jpeg", size: 20 * 1024 * 1024 }),
  );
});

test("phone photos without MIME types use recognized file extensions", () => {
  assert.doesNotThrow(() =>
    validateAvatar({ name: "IMG_001.HEIC", type: "", size: 1024 }),
  );
  assert.doesNotThrow(() =>
    validateAvatar({
      name: "photo.jpg",
      type: "application/octet-stream",
      size: 1024,
    }),
  );
  assert.throws(() =>
    validateAvatar({ name: "photo.txt", type: "", size: 1024 }),
  );
  assert.throws(() =>
    validateAvatar({ name: "photo.jpg", type: "text/plain", size: 1024 }),
  );
});

test("crop exports JPEG for browsers without WebP canvas encoding", async (t) => {
  const { prepareAvatar } = await import("../lib/avatar.js");
  const previousImage = globalThis.Image,
    previousDocument = globalThis.document;
  const calls = [];
  globalThis.Image = class {
    naturalWidth = 3840;
    naturalHeight = 2160;
    async decode() {}
  };
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        fillRect() {},
        drawImage(...args) {
          calls.push(args);
        },
      }),
      toBlob(callback, type) {
        assert.equal(type, "image/jpeg");
        callback(new Blob(["photo"], { type }));
      },
    }),
  };
  t.mock.method(URL, "createObjectURL", () => "blob:photo");
  t.mock.method(URL, "revokeObjectURL", () => {});
  try {
    const result = await prepareAvatar(
      { type: "image/jpeg", size: 1000 },
      { x: 840, y: 0, size: 2160 },
    );
    assert.equal(result.type, "image/jpeg");
    assert.deepEqual(calls[0].slice(1), [840, 0, 2160, 2160, 0, 0, 512, 512]);
  } finally {
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("cover export preserves wide aspect ratio and fits the storage limit", async (t) => {
  const { prepareCover } = await import("../lib/avatar.js");
  const previousImage = globalThis.Image, previousDocument = globalThis.document;
  let attempts = 0;
  const canvas = { getContext: () => ({ fillRect() {}, drawImage() {} }), toBlob(callback, type) { attempts++; callback(new Blob([new Uint8Array(attempts === 1 ? 1024 * 1024 + 1 : 100)], { type })); } };
  globalThis.Image = class { naturalWidth = 4000; naturalHeight = 1000; async decode() {} };
  globalThis.document = { createElement: () => canvas };
  let revoked = false;
  t.mock.method(URL, "createObjectURL", () => "blob:cover");
  t.mock.method(URL, "revokeObjectURL", () => { revoked = true; });
  try {
    const blob = await prepareCover({ type: "image/jpeg", size: 1000 });
    assert.equal(canvas.width, 1920);
    assert.equal(canvas.height, 480);
    assert.equal(blob.type, "image/jpeg");
    assert.ok(blob.size <= 1024 * 1024);
    assert.equal(attempts, 2);
    assert.equal(revoked, true);
  } finally {
    if (previousImage === undefined) delete globalThis.Image; else globalThis.Image = previousImage;
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
  }
});
