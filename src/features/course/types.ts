import type { CourseStatus, EnrollmentStatus } from "@prisma/client"

export type CourseFeeComponentItem = {
  id: string
  name: string
  amount: number
}

export type CourseListItem = {
  id: string
  name: string
  durationMonths: number
  monthlyFee: number
  status: CourseStatus
  /** True when this course bundles other courses under one combined fee. */
  isBundle: boolean
  /** Member courses included in this bundle (for display); empty for a normal course. */
  members: { id: string; name: string; monthlyFee: number }[]
  /** One-time fees (admission/exam/…) charged once per enrolment. */
  components: CourseFeeComponentItem[]
  /** Classes assigned to this course. */
  classCount: number
  /** Active + historical enrolments on this course. */
  enrollmentCount: number
}

/** A student enrolled on a course, for the course detail page. */
export type CourseStudentItem = {
  studentId: string
  fullName: string
  serialNo: number
  effectiveFee: number
  status: EnrollmentStatus
}
