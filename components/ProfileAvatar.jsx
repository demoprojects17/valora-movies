"use client";
import { useState } from "react";
export default function ProfileAvatar({ user, fallback }) {
  const url = user?.user_metadata?.avatar_url;
  const [failed, setFailed] = useState("");
  return typeof url === "string" && url && failed !== url ? (
    <img src={url} alt="" onError={() => setFailed(url)} />
  ) : (
    fallback
  );
}
