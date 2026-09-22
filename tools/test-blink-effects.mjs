// Production Blink/effect/streaming code with minimal Arcade test doubles.
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import vm from "node:vm"

const root = path.resolve(import.meta.dirname, "..")
const cache = [path.join(root, ".pxt/mkc-cache"), path.join(os.homedir(), ".pxt/mkc-cache")]
    .find(dir => fs.existsSync(dir) && ["-targetlight.js", "-pxtworker.js"].every(suffix =>
        fs.readdirSync(dir).some(name => name.endsWith(suffix))))
assert.ok(cache, "Run a MakeCode build first to populate the compiler cache")
const compiler = vm.createContext({ console, setTimeout, clearTimeout })
compiler.self = compiler
compiler.postMessage = compiler.importScripts = () => {}
for (const suffix of ["-targetlight.js", "-pxtworker.js"]) {
    vm.runInContext(fs.readFileSync(path.join(cache,
        fs.readdirSync(cache).find(name => name.endsWith(suffix))), "utf8"), compiler)
}
class TestImage {
    constructor(pixels = [0, 1, 9, 11, 15]) { this.pixels = [...pixels] }
    clone() { return new TestImage(this.pixels) }
    replace(from, to) { this.pixels = this.pixels.map(p => p === from ? to : p) }
}
class TestSprite {
    constructor(image = new TestImage()) { this.image = image; this.z = 10 }
    setPosition(x, y) { this.x = x; this.y = y }
    setFlag(flag, value) { this[flag] = value }
    sayText() {}
    destroy() { effects.splice(effects.indexOf(this), 1) }
}
let effects = [], walls = new Set(), facing = [1, 0]
const context = vm.createContext({
    Math, console, player: null, playerCarVisual: null,
    drivingSessionState: 1, DrivingSessionState: { FreeRoam: 1 },
    caveTeleportUnlocked: true, freeRoamMenuOpen: false,
    racingDrivingEffectsEnabled: true,
    SpriteKind: { DrivingEffect: 1 }, SpriteFlag: { Ghost: "ghost" },
    sprites: { allOfKind: () => effects, create: image => {
        const sprite = new TestSprite(image); effects.push(sprite); return sprite
    } },
    tiles: { getTileLocation: (x, y) => [x, y],
        tileAtLocationIsWall: location => walls.has(location.join(",")) },
    game: { runtime: () => 1000, onUpdate() {} },
    playerCarFacingX: () => facing[0], playerCarFacingY: () => facing[1],
    shakeRacingCamera() {}
})
for (const file of ["freeroam_generation.ts", "driving_effects.ts", "ability_blink.ts"]) {
    vm.runInContext(compiler.ts.transpile(fs.readFileSync(path.join(root, file), "utf8")), context)
}
const run = code => vm.runInContext(code, context)
function reset(direction = [1, 0]) {
    effects = []; walls = new Set(); facing = direction
    context.player = new TestSprite()
    context.playerCarVisual = new TestSprite()
    // Deliberately off-centre to catch trails starting at the wrong origin.
    context.player.setPosition(197.5, 201.25)
    context.playerCarVisual.setPosition(197.5, 201.25)
    context.racingDrivingEffectsEnabled = true
    run("resetBlinkAbility()")
}
function verifyPath(start, end, trail = effects) {
    assert.ok(trail.length >= 2)
    trail.forEach((echo, i) => {
        const t = i / (trail.length - 1)
        assert.ok(Math.abs(echo.x - (start[0] + (end[0] - start[0]) * t)) < 1 / 256)
        assert.ok(Math.abs(echo.y - (start[1] + (end[1] - start[1]) * t)) < 1 / 256)
        assert.equal(echo.ghost, true)
        assert.ok(echo.lifespan >= 250 && echo.lifespan <= 600)
        assert.deepEqual(echo.image.pixels, [0, ...Array(4).fill(i % 2 ? 11 : 9)])
        if (i) assert.ok(echo.lifespan > trail[i - 1].lifespan)
    })
    assert.deepEqual(context.playerCarVisual.image.pixels, [0, 1, 9, 11, 15])
}
for (const direction of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    reset(direction)
    run("useBlinkAbility()")
    const end = [context.player.x, context.player.y]
    verifyPath([197.5, 201.25], end)
    assert.ok(effects.length >= 6 && effects.length <= 7)
    assert.equal(run("blinkAbilityReadyAt"), 6000)
    const count = effects.length
    run("useBlinkAbility()")
    assert.equal(effects.length, count, "Cooldown created a second trail")
    run(`moveFreeRoamPlayerToRebasedPosition(${end[0] - 128}, ${end[1] + 128})`)
    verifyPath([197.5 - 128, 201.25 + 128], [end[0] - 128, end[1] + 128])
    assert.equal(context.playerCarVisual.x, context.player.x)
    assert.equal(context.playerCarVisual.y, context.player.y)
}
reset(); walls.add("15,12")
run("useBlinkAbility()")
verifyPath([197.5, 201.25], [14 * 16 + 8, 12 * 16 + 8])
reset(); walls.add("13,12")
run("useBlinkAbility()")
assert.equal(effects.length, 0)
assert.equal(run("blinkAbilityReadyAt"), 0)
assert.equal(context.player.x, 197.5)

reset(); context.player.setPosition(22 * 16 + 5, 201.25)
run("useBlinkAbility()")
verifyPath([22 * 16 + 5, 201.25], [23 * 16 + 8, 200])

for (const occupied of [16, 17, 18]) {
    reset()
    effects = Array.from({ length: occupied }, () => new TestSprite())
    run("useBlinkAbility()")
    assert.ok(effects.length <= 18)
    if (occupied === 16) verifyPath([197.5, 201.25], [280, 200], effects.slice(16))
    else assert.equal(effects.length, occupied, "Insufficient room must not leave a truncated trail")
    assert.equal(context.player.x, 280, "Effect budget must not block teleportation")
}
reset(); context.racingDrivingEffectsEnabled = false
run("useBlinkAbility()")
assert.equal(effects.length, 0)
assert.equal(context.player.x, 280)
console.log("PASS: Blink path endpoints, four directions, shared native images, wall/boundary limits,")
console.log("      cooldown, streamed rebasing, disabled FX, and the 18-sprite budget")
