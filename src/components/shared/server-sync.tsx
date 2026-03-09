"use client";

import { useEffect } from "react";
import { initFromServer } from "@/lib/member-store";

export function ServerSync() {
  useEffect(() => {
    initFromServer();
  }, []);
  return null;
}
