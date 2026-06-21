// Mirror production tickets (and their comments) into the dev (sandbox) DB so
// prod support requests show up locally during development. Sibling of
// sync-prod-notes.mjs — same philosophy, same idempotency.
//
// - Reads tickets/comments from PROD_DATABASE_URL (prod, treated read-only) and
//   upserts them into DATABASE_URL (the sandbox dev DB) by id, so re-runs never
//   duplicate ("keep unique").
// - Only the CONTENT is mirrored (subject, body, category/priority/status,
//   timestamps). Every mirrored row is attributed to a single dedicated
//   "Prod Mirror" user and the dev institute — prod requester/author and
//   institution are intentionally NOT copied (and Neon Auth is per-branch, so
//   prod user ids may not even exist in dev).
//
// Safe to run repeatedly (idempotent). No-ops quietly if PROD_DATABASE_URL is
// unset, so it never blocks a session. Run manually with:
//   node scripts/sync-prod-tickets.mjs
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import pg from "pg"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const MIRROR_USER_ID = "11111111-1111-4111-8111-111111111111"
const log = (m) => console.error(`[sync-prod-tickets] ${m}`)

// Read .env directly so the script works without a dotenv loader / Node flag.
function envFromFile() {
  const out = {}
  try {
    for (const line of readFileSync(join(ROOT, ".env"), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  } catch {
    /* no .env — fall back to process.env */
  }
  return out
}

async function main() {
  const env = { ...envFromFile(), ...process.env }
  const PROD = env.PROD_DATABASE_URL
  const DEV = env.DATABASE_URL

  if (!PROD) return log("PROD_DATABASE_URL not set — skipping tickets sync.")
  if (!DEV) return log("DATABASE_URL not set — skipping tickets sync.")

  // Neon always needs TLS; pass it via the ssl option and strip the URL's ssl
  // params so pg doesn't emit its sslmode-deprecation warning every run.
  const client = (connectionString) => {
    const u = new URL(connectionString)
    u.searchParams.delete("sslmode")
    u.searchParams.delete("channel_binding")
    return new pg.Client({
      connectionString: u.toString(),
      ssl: { rejectUnauthorized: false },
    })
  }

  const prod = client(PROD)
  const dev = client(DEV)

  try {
    await prod.connect()
    await dev.connect()

    const { rows: tickets } = await prod.query(
      `SELECT id, subject, description, category, priority, status,
              "resolvedAt", "createdAt", "updatedAt"
       FROM public."Ticket" ORDER BY "createdAt"`
    )
    const { rows: comments } = await prod.query(
      `SELECT id, "ticketId", body, "authorIsStaff", "createdAt", "updatedAt"
       FROM public."TicketComment" ORDER BY "createdAt"`
    )

    const { rows: inst } = await dev.query(
      `SELECT id FROM public."Institute" ORDER BY "createdAt" LIMIT 1`
    )
    if (!inst.length) return log("no institute in dev DB — skipping.")
    const instituteId = inst[0].id

    await dev.query(
      `INSERT INTO neon_auth.user (id, name, email, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, 'Prod Mirror', 'prod-mirror@dev.local', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO NOTHING`,
      [MIRROR_USER_ID]
    )

    // New prod tickets are inserted; existing ones get prod's CONTENT updates pulled
    // down (subject/description/category/priority/status/resolvedAt). instituteId and
    // requesterId are only set on insert — existing dev rows keep their Prod Mirror
    // attribution. The WHERE skips no-op writes; RETURNING xmax distinguishes the two.
    let addedT = 0
    let updatedT = 0
    for (const t of tickets) {
      const res = await dev.query(
        `INSERT INTO public."Ticket"
           (id, "instituteId", "requesterId", subject, description,
            category, priority, status, "resolvedAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5,
            $6::"TicketCategory", $7::"TicketPriority", $8::"TicketStatus", $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           subject = EXCLUDED.subject,
           description = EXCLUDED.description,
           category = EXCLUDED.category,
           priority = EXCLUDED.priority,
           status = EXCLUDED.status,
           "resolvedAt" = EXCLUDED."resolvedAt",
           "updatedAt" = EXCLUDED."updatedAt"
         WHERE public."Ticket".subject      IS DISTINCT FROM EXCLUDED.subject
            OR public."Ticket".description   IS DISTINCT FROM EXCLUDED.description
            OR public."Ticket".category      IS DISTINCT FROM EXCLUDED.category
            OR public."Ticket".priority      IS DISTINCT FROM EXCLUDED.priority
            OR public."Ticket".status        IS DISTINCT FROM EXCLUDED.status
            OR public."Ticket"."resolvedAt"  IS DISTINCT FROM EXCLUDED."resolvedAt"
         RETURNING (xmax = 0) AS inserted`,
        [t.id, instituteId, MIRROR_USER_ID, t.subject, t.description,
         t.category, t.priority, t.status, t.resolvedAt, t.createdAt, t.updatedAt]
      )
      if (res.rowCount > 0) (res.rows[0].inserted ? addedT++ : updatedT++)
    }

    // Comments after tickets so the ticketId FK is satisfied. Any comment whose
    // ticket isn't in dev is skipped rather than aborting the whole run.
    let addedC = 0
    for (const c of comments) {
      try {
        const res = await dev.query(
          `INSERT INTO public."TicketComment"
             (id, "ticketId", "authorId", body, "authorIsStaff", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [c.id, c.ticketId, MIRROR_USER_ID, c.body, c.authorIsStaff, c.createdAt, c.updatedAt]
        )
        addedC += res.rowCount
      } catch (e) {
        log(`skipped comment ${c.id}: ${e.message}`)
      }
    }

    log(`${tickets.length} prod tickets seen, ${addedT} new, ${updatedT} updated; ${comments.length} comments seen, ${addedC} new in dev.`)
  } catch (e) {
    log(`failed: ${e.message}`)
  } finally {
    await prod.end().catch(() => {})
    await dev.end().catch(() => {})
  }
}

main()
