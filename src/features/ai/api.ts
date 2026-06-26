"use client"

import { http, buildQuery } from "@/lib/http"
import type { InsightResult } from "./types"

export const aiApi = {
  insights: (refresh?: boolean) =>
    http.get<InsightResult>(
      `/api/ai/insights${buildQuery({ refresh: refresh ? 1 : undefined })}`
    ),
}
