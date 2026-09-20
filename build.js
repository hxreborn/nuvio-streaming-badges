const fs = require("fs")
const path = require("path")

const BASE = process.argv[2] || "__RAW_BASE__"

const SERVICES = [
    ["Movistar Plus+", "movistarplus", String.raw`(?i)\bmovistar(?:[\s._-]?plus\+?)?\b`],
    ["Filmin", "filmin", String.raw`(?i)\bfilmin(?:[\s._-]?plus)?\b`],
    ["SkyShowtime", "skyshowtime", String.raw`(?i)\bsky[\s._-]?showtime\b`],
    ["FlixOlé", "flixole", String.raw`(?i)\bflix[\s._-]?ol[eé]`],
    ["MUBI", "mubi", String.raw`(?i)\bmubi\b`],
    ["Rakuten TV", "rakutentv", String.raw`(?i)\brakuten(?:[\s._-]?tv)?\b`],
    ["Atres Player", "atresplayer", String.raw`(?i)\batres[\s._-]?player\b`],
    ["Crunchyroll", "crunchyroll", String.raw`(?i)\b(?:crunchyroll|crunchy|crunch)\b`],
]

const VARIANTS = {
    mono: {
        file: "badges-es-mono.json",
        prefix: "mono",
        group: { borderColor: "#FF858283", color: "#000000", id: "ges", isExpanded: true, name: "Streaming ES" },
        chip: { borderColor: "#FF858283", tagColor: "#0B0B0B", tagStyle: "filled and bordered", textColor: "#FFFFFF" },
    },
    color: {
        file: "badges-es-color.json",
        prefix: "color",
        group: { borderColor: "#FF858283", color: "#000000", id: "gesc", isExpanded: true, name: "Streaming ES" },
        chip: { borderColor: "#00000000", tagColor: "#00000000", tagStyle: "transparent", textColor: "#FFFFFF" },
    },
}

function buildVariant(key) {
    const v = VARIANTS[key]
    const filters = SERVICES.map(([name, slug, pattern]) => ({
        ...v.chip,
        groupId: v.group.id,
        id: `${v.group.id}-${slug}`,
        imageURL: `${BASE}/images/${v.prefix}-${slug}.png`,
        isEnabled: true,
        name: "🍿 " + name.toUpperCase(),
        pattern,
        type: "filter",
    }))
    const pack = { filters, groups: [v.group] }
    fs.writeFileSync(path.join(__dirname, v.file), JSON.stringify(pack, null, 1) + "\n")
    return pack
}

const compile = (p) => new RegExp(p.replace(/^\(\?i\)/, ""), "i")
const NAMES = SERVICES.map(([n]) => n)
const FOREIGN = ["Netflix", "Prime Video", "HBO Max", "AppleTV+", "Disney+", "Hulu", "Peacock"]
const RESELLERS = [["Movistar Plus+ Ficción Total", "MOVISTAR PLUS+"], ["Filmin Plus", "FILMIN"]]

let bad = 0
for (const key of Object.keys(VARIANTS)) {
    const pack = buildVariant(key)
    const hit = (text) => pack.filters
        .filter((f) => compile(f.pattern).test(text)).map((f) => f.name.replace("🍿 ", ""))
    for (const name of NAMES) {
        const got = hit(`💾 20 GB  🌐 1fichier.com  📺 ${name}`)
        if (got.length !== 1) { console.log(`BAD ${key} ${name} -> ${got.join(",") || "nothing"}`); bad += 1 }
    }
    for (const name of FOREIGN) {
        const got = hit(`📺 ${name}`)
        if (got.length !== 0) { console.log(`BAD ${key} ${name} leaked -> ${got.join(",")}`); bad += 1 }
    }
    for (const [text, want] of RESELLERS) {
        const got = hit(`📺 ${text}`)
        if (got.length !== 1 || got[0] !== want) { console.log(`BAD ${key} ${text} -> ${got.join(",") || "nothing"}`); bad += 1 }
    }
    for (const f of pack.filters) {
        const img = path.join(__dirname, "images", path.basename(f.imageURL))
        if (!fs.existsSync(img)) { console.log(`BAD ${key} missing artwork ${path.basename(img)}`); bad += 1 }
    }
    if (BASE !== "__RAW_BASE__" && pack.filters.some((f) => f.imageURL.includes("__RAW_BASE__"))) {
        console.log(`BAD ${key} placeholder left in image urls`); bad += 1
    }
    console.log(`${v(key)} ${pack.filters.length} badges -> ${VARIANTS[key].file}`)
}
function v(k) { return k.padEnd(5) }

console.log(bad === 0 ? "both variants behave" : `${bad} PROBLEMS`)
process.exit(bad === 0 ? 0 : 1)
