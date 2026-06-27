"use client"

import { http } from "@/lib/http"
import type { ReportRequest } from "./schema"
import type { ReportResult } from "./types"

export const reportsApi = {
  run: (req: ReportRequest) => http.post<ReportResult>("/api/ai/reports", req),
}
