import fs from "fs"
import path from "path"
import vm from "vm"

const projectRoot = process.cwd()
const cacheDirectory = path.join(projectRoot, ".pxt", "mkc-cache")
const cacheFiles = fs.readdirSync(cacheDirectory)
const targetPath = path.join(cacheDirectory, cacheFiles.find(name => name.endsWith("-targetlight.js")))
const targetJsonPath = path.join(cacheDirectory, cacheFiles.find(name => name.endsWith("-target.json")))
const workerPath = path.join(cacheDirectory, cacheFiles.find(name => name.endsWith("-pxtworker.js")))

globalThis.self = globalThis
globalThis.postMessage = () => {}
globalThis.importScripts = () => {}
vm.runInThisContext(fs.readFileSync(targetPath, "utf8"), { filename: targetPath })
vm.runInThisContext(fs.readFileSync(workerPath, "utf8"), { filename: workerPath })
Object.assign(pxtTargetBundle, JSON.parse(fs.readFileSync(targetJsonPath, "utf8")))

const packageFiles = {}
function collectFiles(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === ".pxt" || entry.name === "garage-background-previews" || entry.name === "tools") {
            continue
        }
        const absolutePath = path.join(directory, entry.name)
        if (entry.isDirectory()) {
            collectFiles(absolutePath)
        } else {
            const relativePath = path.relative(projectRoot, absolutePath).replaceAll("\\", "/")
            packageFiles[relativePath] = fs.readFileSync(absolutePath, "utf8")
        }
    }
}
collectFiles(projectRoot)

pxt.setupSimpleCompile()
const result = await pxt.simpleCompileAsync(packageFiles, { native: false })
for (const diagnostic of result.diagnostics || []) {
    console.log(ts.pxtc.getDiagnosticString(diagnostic))
}
if (!result.success) {
    throw new Error(result.errors || "MakeCode compilation failed")
}
console.log("MakeCode Arcade compile succeeded.")
