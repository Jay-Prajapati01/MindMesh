"use client";
import { use, useEffect, useState } from "react";
import { api, API_URL } from "@/lib/api";
import { cloudMode } from "@/lib/auth";

export default function OpenSource({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [message, setMessage] = useState("Opening your file…");
  useEffect(() => {
    if (!cloudMode) { window.location.replace(`${API_URL}/api/sources/${encodeURIComponent(id)}/view`); return; }
    api.get(`/sources/${encodeURIComponent(id)}/link`).then(({ data }) => window.location.replace(data.url))
      .catch(() => setMessage("Unable to open this file. Check your workspace access and try again."));
  }, [id]);
  return <p>{message}</p>;
}
