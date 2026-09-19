import fs from "fs"
import path from "path"
import vm from "vm"

// This intentionally delegates generated TypeScript to MakeCode's own asset
// emitter. images.g.jres remains the editable source of truth; images.g.ts is
// never assembled or hand-edited by this tool.
const projectRoot = process.cwd()
const cacheDirectory = path.join(projectRoot, ".pxt", "mkc-cache")
const cacheFiles = fs.readdirSync(cacheDirectory)
const targetPath = path.join(cacheDirectory, cacheFiles.find(name => name.endsWith("-targetlight.js")))
const targetJsonPath = path.join(cacheDirectory, cacheFiles.find(name => name.endsWith("-target.json")))
const workerPath = path.join(cacheDirectory, cacheFiles.find(name => name.endsWith("-pxtworker.js")))

for (const requiredPath of [targetPath, targetJsonPath, workerPath]) {
    if (!requiredPath || !fs.existsSync(requiredPath)) {
        throw new Error("MakeCode cache is incomplete. Run a MakeCode build before regenerating bindings.")
    }
}

globalThis.self = globalThis
globalThis.postMessage = () => {}
globalThis.importScripts = () => {}
vm.runInThisContext(fs.readFileSync(targetPath, "utf8"), { filename: targetPath })
vm.runInThisContext(fs.readFileSync(workerPath, "utf8"), { filename: workerPath })
Object.assign(pxtTargetBundle, JSON.parse(fs.readFileSync(targetJsonPath, "utf8")))

const jresPath = path.join(projectRoot, "images.g.jres")
const outputPath = path.join(projectRoot, "images.g.ts")
const jres = JSON.parse(fs.readFileSync(jresPath, "utf8"))
function normalizeLineEndings(source) {
    return source
        .replaceAll("\r\n", "\n")
        .replaceAll("\n", "\r\n")
}

const generated = normalizeLineEndings(pxt.emitProjectImages(jres))
const checkOnly = process.argv.includes("--check")

if (checkOnly) {
    const current = normalizeLineEndings(fs.readFileSync(outputPath, "utf8"))
    if (current !== generated) {
        console.error("images.g.ts is stale. Run: node tools/regenerate_image_bindings.mjs")
        process.exit(1)
    }
    console.log("images.g.ts matches MakeCode's generated output.")
} else {
    fs.writeFileSync(outputPath, generated, "utf8")
    const count = Object.keys(jres).filter(key => key !== "*").length
    console.log(`Regenerated images.g.ts with MakeCode's emitter (${count} assets).`)
}
