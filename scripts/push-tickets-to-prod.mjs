// Push ticket EDITS made in dev back to production — the reverse of
// sync-prod-tickets.mjs. Use when you've triaged/edited a mirrored ticket in the
// dev sandbox (changed status/priority/category, resolved it, fixed wording) and
// want prod to reflect it.
//
// HARD RULES (by design):
//   • UPDATE-ONLY. Matches prod rows by id; a dev-only ticket matches zero prod
//     rows, so it is never created in prod. Never deletes.
//   • Only CONTENT fields move (subject, description, category, priority, status,
//     resolvedAt). requesterId/instituteId are NEVER touched — dev attributes
//     mirrored tickets to the "Prod Mirror" user, and we must not overwrite prod's
//     real requester/institution with that.
//   • Replies (comments) DO sync: a new dev reply on a ticket that already exists
//     in prod is added by id (idempotent); replies on dev-only tickets are skipped.
//     Author is kept when that user exists in prod, else nulled (authorIsStaff kept).
//     This edits an existing ticket's thread — it never creates a new ticket.
//
// SAFETY: this writes to PRODUCTION, so it is a DRY RUN by default — it only
// reports what would change. Pass --apply to actually update prod.
//   node scripts/push-tickets-to-prod.mjs            # dry run (no writes)
//   node scripts/push-tickets-to-prod.mjs --apply    # write to prod
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import pg from "pg"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const APPLY = process.argv.includes("--apply")
const log = (m) => console.error(`[push-tickets-to-prod] ${m}`)

// Content fields that may legitimately change in dev and flow back to prod.
const FIELDS = ["subject", "description", "category", "priority", "status", "resolvedAt"]
const norm = (v) => (v instanceof Date ? v.toISOString() : v ?? null)

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
  const DEV = env.DATABASE_URL
  const PROD = env.PROD_DATABASE_URL

  if (!DEV) return log("DATABASE_URL not set — skipping.")
  if (!PROD) return log("PROD_DATABASE_URL not set — skipping.")

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

  const dev = client(DEV)
  const prod = client(PROD)

  log(APPLY ? "APPLY mode — will WRITE to production." : "DRY RUN — no writes. Pass --apply to commit.")

  try {
    await dev.connect()
    await prod.connect()

    const sel = `SELECT id, subject, description, category, priority, status, "resolvedAt" FROM public."Ticket"`
    const { rows: devRows } = await dev.query(sel)
    const { rows: prodRows } = await prod.query(sel)
    const prodById = new Map(prodRows.map((r) => [r.id, r]))

    let updated = 0
    let skippedMissing = 0 // dev-only ticket — not in prod, so never created
    let unchanged = 0

    for (const d of devRows) {
      const p = prodById.get(d.id)
      if (!p) {
        skippedMissing++
        continue
      }
      const changed = FIELDS.filter((f) => norm(d[f]) !== norm(p[f]))
      if (changed.length === 0) {
        unchanged++
        continue
      }
      log(`${d.id} — ${changed.join(", ")} | "${d.subject.slice(0, 50)}"`)
      if (APPLY) {
        await prod.query(
          `UPDATE public."Ticket"
             SET subject = $2, description = $3,
                 category = $4::"TicketCategory", priority = $5::"TicketPriority",
                 status = $6::"TicketStatus", "resolvedAt" = $7, "updatedAt" = now()
           WHERE id = $1`,
          [d.id, d.subject, d.description, d.category, d.priority, d.status, d.resolvedAt]
        )
      }
      updated++
    }

    // New replies on tickets that already exist in prod. A reply is an update to an
    // existing ticket's thread, so it syncs; a new whole ticket never does.
    const { rows: devComments } = await dev.query(
      `SELECT id, "ticketId", "authorId", body, "authorIsStaff", "createdAt", "updatedAt"
       FROM public."TicketComment" ORDER BY "createdAt"`
    )
    const { rows: prodCmt } = await prod.query(`SELECT id FROM public."TicketComment"`)
    const prodHasComment = new Set(prodCmt.map((r) => r.id))
    const { rows: prodUsers } = await prod.query(`SELECT id FROM neon_auth."user"`)
    const prodHasUser = new Set(prodUsers.map((r) => r.id))

    let addedComments = 0
    for (const c of devComments) {
      if (!prodById.has(c.ticketId)) continue // ticket not in prod → nothing to attach to
      if (prodHasComment.has(c.id)) continue // already pushed
      const authorId = c.authorId && prodHasUser.has(c.authorId) ? c.authorId : null
      log(`+ reply ${c.id} on ${c.ticketId} | "${c.body.slice(0, 50)}"`)
      if (APPLY) {
        await prod.query(
          `INSERT INTO public."TicketComment"
             (id, "ticketId", "authorId", body, "authorIsStaff", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [c.id, c.ticketId, authorId, c.body, c.authorIsStaff, c.createdAt, c.updatedAt]
        )
      }
      addedComments++
    }

    log(
      `${devRows.length} dev tickets · ${unchanged} unchanged · ${skippedMissing} dev-only skipped · ` +
        `${updated} ${APPLY ? "updated" : "would update"} · ` +
        `${addedComments} ${APPLY ? "replies added" : "replies would add"} in prod.`
    )
    if (!APPLY && (updated > 0 || addedComments > 0)) log("Re-run with --apply to write these to prod.")
  } catch (e) {
    log(`failed: ${e.message}`)
  } finally {
    await dev.end().catch(() => {})
    await prod.end().catch(() => {})
  }
}

main()
