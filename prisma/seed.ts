import { PrismaClient, type AttendanceStatus } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { config as loadEnv } from "dotenv"

import {
  ALL_PERMISSIONS,
  permissionModule,
  resolveRolePermissions,
  ROLE_KEYS,
  SYSTEM_ROLES,
  type Permission,
  type RoleKey,
} from "../src/lib/rbac"

loadEnv()

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DIRECT_URL as string),
})

// Roles that exist within an institute (SUPER_ADMIN is a platform flag, not an
// institute role) — used by the seed and reusable when new institutes are created.
const INSTITUTE_ROLE_KEYS: RoleKey[] = [ROLE_KEYS.INSTITUTE_ADMIN, ROLE_KEYS.TEACHER]

function humanize(permission: Permission): string {
  const [moduleName, action] = permission.split(":")
  const verb = action.charAt(0).toUpperCase() + action.slice(1)
  return `${verb} ${moduleName}`
}

async function seedPermissions() {
  for (const key of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, module: permissionModule(key), description: humanize(key) },
      update: { module: permissionModule(key), description: humanize(key) },
    })
  }
  console.log(`  ✓ ${ALL_PERMISSIONS.length} permissions`)
}

/** Creates the institute-scoped roles + their permission grants. Idempotent. */
async function seedInstituteRoles(instituteId: string) {
  for (const template of SYSTEM_ROLES) {
    if (!INSTITUTE_ROLE_KEYS.includes(template.key)) continue

    const role = await prisma.role.upsert({
      where: { instituteId_key: { instituteId, key: template.key } },
      create: {
        instituteId,
        key: template.key,
        name: template.name,
        description: template.description,
        isSystem: true,
      },
      update: { name: template.name, description: template.description },
    })

    const keys = resolveRolePermissions(template)
    const perms = await prisma.permission.findMany({
      where: { key: { in: keys } },
      select: { id: true },
    })
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    })
  }
  console.log(`  ✓ institute roles + permission grants`)
}

const DEMO_CLASSES = [
  { name: "Class 8", section: "A", defaultMonthlyFee: 1200 },
  { name: "Class 9", section: "A", defaultMonthlyFee: 1500 },
  { name: "Class 10", section: "A", defaultMonthlyFee: 1800 },
]

const DEMO_STUDENTS = [
  { fullName: "Aarav Sharma", className: "Class 10", guardianName: "Rajesh Sharma", contactNumber: "9876543210", monthlyFee: 1800 },
  { fullName: "Diya Patel", className: "Class 10", guardianName: "Nilesh Patel", contactNumber: "9876543211", monthlyFee: 1800 },
  { fullName: "Vihaan Gupta", className: "Class 9", guardianName: "Anil Gupta", contactNumber: "9876543212", monthlyFee: 1500 },
  { fullName: "Ananya Singh", className: "Class 9", guardianName: "Pooja Singh", contactNumber: "9876543213", monthlyFee: 1500 },
  { fullName: "Aditya Verma", className: "Class 8", guardianName: "Suresh Verma", contactNumber: "9876543214", monthlyFee: 1200 },
  { fullName: "Ishaan Reddy", className: "Class 8", guardianName: "Kiran Reddy", contactNumber: "9876543215", monthlyFee: 1200 },
  { fullName: "Saanvi Joshi", className: "Class 10", guardianName: "Manish Joshi", contactNumber: "9876543216", monthlyFee: 1800 },
  { fullName: "Kabir Mehta", className: "Class 9", guardianName: "Deepak Mehta", contactNumber: "9876543217", monthlyFee: 1500 },
  { fullName: "Aadhya Nair", className: "Class 8", guardianName: "Vinod Nair", contactNumber: "9876543218", monthlyFee: 1200 },
  { fullName: "Reyansh Kumar", className: "Class 10", guardianName: "Ramesh Kumar", contactNumber: "9876543219", monthlyFee: 1800 },
]

async function seedDemoData(instituteId: string) {
  const existing = await prisma.student.count({ where: { instituteId } })
  if (existing > 0) {
    console.log(`  • demo academic data already present (${existing} students) — skipping`)
    return
  }

  const classByName = new Map<string, string>()
  for (const c of DEMO_CLASSES) {
    const cls = await prisma.class.upsert({
      where: { instituteId_name: { instituteId, name: c.name } },
      create: { instituteId, name: c.name, section: c.section, defaultMonthlyFee: c.defaultMonthlyFee },
      update: {},
    })
    classByName.set(c.name, cls.id)
  }

  const today = new Date()
  const admissionBase = new Date(today.getFullYear(), today.getMonth() - 4, 1)

  for (let i = 0; i < DEMO_STUDENTS.length; i++) {
    const s = DEMO_STUDENTS[i]
    const student = await prisma.student.create({
      data: {
        instituteId,
        serialNo: i + 1,
        rollNumber: String(i + 1).padStart(3, "0"),
        fullName: s.fullName,
        classId: classByName.get(s.className) ?? null,
        guardianName: s.guardianName,
        contactNumber: s.contactNumber,
        admissionDate: admissionBase,
        monthlyFee: s.monthlyFee,
        status: "ACTIVE",
      },
    })

    // Attendance for the last 5 days (skip weekends), mostly present.
    const attendance: { instituteId: string; studentId: string; date: Date; status: AttendanceStatus }[] = []
    for (let d = 0; d < 5; d++) {
      const date = new Date(today)
      date.setDate(today.getDate() - d)
      const day = date.getDay()
      if (day === 0 || day === 6) continue
      const roll = (i + d) % 7
      const status: AttendanceStatus = roll === 0 ? "ABSENT" : roll === 1 ? "LEAVE" : "PRESENT"
      attendance.push({ instituteId, studentId: student.id, date, status })
    }
    if (attendance.length) {
      await prisma.attendance.createMany({ data: attendance, skipDuplicates: true })
    }

    // ~70% of students have paid this month's fee.
    if (i % 10 < 7) {
      await prisma.feePayment.create({
        data: {
          instituteId,
          studentId: student.id,
          amount: s.monthlyFee,
          periodMonth: today.getMonth() + 1,
          periodYear: today.getFullYear(),
          method: "CASH",
          paidAt: new Date(today.getFullYear(), today.getMonth(), Math.min(i + 1, 28)),
          receiptNo: i + 1,
          note: "Monthly tuition fee",
        },
      })
    }
  }
  console.log(`  ✓ ${DEMO_STUDENTS.length} students with attendance + fee history`)
}

async function main() {
  console.log("Seeding Tsudori…")

  await seedPermissions()

  const institute = await prisma.institute.upsert({
    where: { slug: "demo-academy" },
    create: {
      name: "Tsudori Demo Academy",
      slug: "demo-academy",
      email: "office@demo-academy.test",
      phone: "9000000000",
      city: "Pune",
      state: "Maharashtra",
    },
    update: {},
  })
  console.log(`  ✓ institute "${institute.name}"`)

  await seedInstituteRoles(institute.id)
  await seedDemoData(institute.id)

  console.log("Done. Sign in with BOOTSTRAP_ADMIN_EMAIL to claim admin access.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
