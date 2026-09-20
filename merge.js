const fs = require("fs")
const path = require("path")

const BASE = process.argv[2] || "__RAW_BASE__"
const upstream = JSON.parse(fs.readFileSync(path.join(__dirname, "upstream.json"), "utf8"))
const addon = JSON.parse(fs.readFileSync(path.join(__dirname, "badges-es-mono.json"), "utf8"))

const streaming = upstream.groups.find((g) => /^streaming$/i.test(g.name))
if (!streaming) throw new Error("upstream has no Streaming group")

const CRUNCHY = String.raw`(?i)\b(?:crunchyroll|crunchy|crunch)\b`
const filters = upstream.filters.map((f) =>
    (/crunch/i.test(f.name) ? { ...f, pattern: CRUNCHY } : f))

const added = addon.filters
    .filter((f) => !/crunch/i.test(f.name))
    .map((f) => ({ ...f, groupId: streaming.id, imageURL: f.imageURL.replace("__RAW_BASE__", BASE) }))

const merged = { filters: [...filters, ...added], groups: upstream.groups }
fs.writeFileSync(path.join(__dirname, "badges-all.json"), JSON.stringify(merged, null, 1) + "\n")

const compile = (p) => new RegExp(p.replace(/^\(\?i\)/, ""), "i")
const cases = [
    ["Netflix", 1], ["Prime Video", 1], ["AppleTV+", 1], ["Disney+", 1], ["HBO Max", 1],
    ["Crunchyroll", 1], ["Movistar Plus+", 1], ["Filmin", 1], ["SkyShowtime", 1],
    ["FlixOlé", 1], ["MUBI", 1], ["Rakuten TV", 1], ["Atres Player", 1],
]
let bad = 0
for (const [name, want] of cases) {
    const row = `💾 20 GB  🌐 1fichier.com  📺 ${name}`
    const hits = merged.filters.filter((f) => f.isEnabled !== false)
        .filter((f) => { try { return compile(f.pattern).test(row) } catch { return false } })
        .filter((f) => f.groupId === streaming.id)
        .map((f) => f.name)
    const ok = hits.length === want
    if (!ok) bad += 1
    console.log((ok ? "ok  " : "BAD ") + name.padEnd(16) + "-> " + (hits.join(", ") || "nothing"))
}
const ids = merged.filters.map((f) => f.id)
if (new Set(ids).size !== ids.length) { console.log("BAD duplicate filter ids"); bad += 1 }
console.log(`\n${merged.filters.length} badges, ${merged.groups.length} groups`)
console.log(bad === 0 ? "merged pack behaves" : `${bad} PROBLEMS`)
process.exit(bad === 0 ? 0 : 1)
