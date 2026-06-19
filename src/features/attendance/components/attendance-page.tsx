"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { ALL_CLASSES } from "@/lib/constants"
import { toDateInputValue } from "@/lib/format"
import { shiftMonthStr } from "@/lib/date-helper"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useClasses } from "@/features/classes/hooks"
import { AttendanceDayView } from "./attendance-day-view"
import { AttendanceReport } from "./attendance-report"

function todayStr() {
  return toDateInputValue(new Date())
}

function currentMonth() {
  return todayStr().slice(0, 7)
}

function formatMonth(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  })
}

function shiftMonth(yyyyMm: string, delta: number) {
  return shiftMonthStr(yyyyMm, delta)
}

type Props = { canMark: boolean }

export function AttendancePage({ canMark }: Props) {
  const { data: classes } = useClasses()
  const [tab, setTab] = useState<"mark" | "report">("mark")
  const [classId, setClassId] = useState<string>(ALL_CLASSES)
  const [date, setDate] = useState<string>(todayStr())
  const [month, setMonth] = useState<string>(currentMonth())

  const activeClasses = classes?.filter((c) => c.status === "ACTIVE") ?? []
  const isAll = classId === ALL_CLASSES

  const selectedName = isAll
    ? "All classes"
    : (activeClasses.find((c) => c.id === classId)?.name ?? "All classes")

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as "mark" | "report")}
    >
      <TabsList>
        <TabsTrigger value="mark">Mark</TabsTrigger>
        <TabsTrigger value="report">Monthly report</TabsTrigger>
      </TabsList>

      <div className="mt-4 space-y-4">
        {/* Controls row */}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Select value={classId} onValueChange={(v) => setClassId(v ?? ALL_CLASSES)}>
              <SelectTrigger className="w-full">
                <SelectValue>{() => selectedName}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CLASSES}>All classes</SelectItem>
                {activeClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.section ? ` / ${c.section}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tab === "mark" && (
            <div className="w-36 shrink-0">
              {/* Can't take attendance for a day that hasn't happened — cap at today. */}
              <DatePicker value={date} onChange={setDate} max={todayStr()} />
            </div>
          )}

          {tab === "report" && (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setMonth((m) => shiftMonth(m, -1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="w-20 text-center text-sm font-medium">
                {formatMonth(month)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setMonth((m) => shiftMonth(m, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="mark">
          <AttendanceDayView classId={classId} date={date} canMark={canMark} />
        </TabsContent>

        <TabsContent value="report">
          {isAll ? (
            activeClasses.length === 0 ? (
              <p className="text-muted-foreground py-16 text-center text-sm">
                No active classes found.
              </p>
            ) : (
              <div className="space-y-6">
                {activeClasses.map((c) => (
                  <div key={c.id}>
                    <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
                      {c.name}{c.section ? ` / ${c.section}` : ""}
                    </p>
                    <AttendanceReport classId={c.id} month={month} />
                  </div>
                ))}
              </div>
            )
          ) : (
            <AttendanceReport classId={classId} month={month} />
          )}
        </TabsContent>
      </div>
    </Tabs>
  )
}
