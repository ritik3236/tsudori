"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { toDateInputValue } from "@/lib/format"
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

const NO_CLASS = "__none__"

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
  const [y, m] = yyyyMm.split("-").map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

type Props = { canMark: boolean }

export function AttendancePage({ canMark }: Props) {
  const { data: classes } = useClasses()
  const [tab, setTab] = useState<"mark" | "report">("mark")
  const [classId, setClassId] = useState<string>(NO_CLASS)
  const [date, setDate] = useState<string>(todayStr())
  const [month, setMonth] = useState<string>(currentMonth())

  const activeClasses = classes?.filter((c) => c.status === "ACTIVE") ?? []

  // Auto-select the first class when data loads
  const didAutoSelect = useRef(false)
  useEffect(() => {
    if (!didAutoSelect.current && classId === NO_CLASS && activeClasses.length > 0) {
      didAutoSelect.current = true
      setClassId(activeClasses[0].id)
    }
  }, [activeClasses, classId])
  const selectedClass = classId !== NO_CLASS ? classId : null

  const selectedName =
    classId !== NO_CLASS
      ? (activeClasses.find((c) => c.id === classId)?.name ?? "Select class")
      : "Select class"

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
        {/* Controls row — always one line */}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Select value={classId} onValueChange={(v) => setClassId(v ?? NO_CLASS)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {() => selectedName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CLASS}>Select class</SelectItem>
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
              <DatePicker value={date} onChange={setDate} />
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
          {selectedClass ? (
            <AttendanceDayView
              classId={selectedClass}
              date={date}
              canMark={canMark}
            />
          ) : (
            <ClassPrompt />
          )}
        </TabsContent>

        <TabsContent value="report">
          {selectedClass ? (
            <AttendanceReport classId={selectedClass} month={month} />
          ) : (
            <ClassPrompt />
          )}
        </TabsContent>
      </div>
    </Tabs>
  )
}

function ClassPrompt() {
  return (
    <p className="text-muted-foreground py-16 text-center text-sm">
      Select a class to continue.
    </p>
  )
}
