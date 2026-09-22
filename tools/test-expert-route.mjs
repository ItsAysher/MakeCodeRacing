// Executes production TypeScript against the authored tilemap, with no npm install.
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import vm from "node:vm"

const root = path.resolve(import.meta.dirname, "..")
const cache = [path.join(root, ".pxt/mkc-cache"), path.join(os.homedir(), ".pxt/mkc-cache")]
    .find(dir => fs.existsSync(dir) && ["-targetlight.js", "-pxtworker.js"].every(suffix =>
        fs.readdirSync(dir).some(name => name.endsWith(suffix))))
assert.ok(cache, "Run a MakeCode build first to cache the TypeScript compiler")
const files = fs.readdirSync(cache)
const compiler = vm.createContext({ console, setTimeout, clearTimeout })
compiler.self = compiler
compiler.postMessage = () => {}
compiler.importScripts = () => {}
for (const suffix of ["-targetlight.js", "-pxtworker.js"]) {
    vm.runInContext(fs.readFileSync(path.join(cache,
        files.find(name => name.endsWith(suffix))), "utf8"), compiler)
}
const resources = JSON.parse(fs.readFileSync(path.join(root, "tilemap.g.jres")))
const resource = Object.values(resources).find(x => x.displayName === "expertRaceMap")
const bytes = Buffer.from(Buffer.from(resource.data, "base64").toString(), "hex")
const width = bytes.readUInt16LE(1), height = bytes.readUInt16LE(3)
const tile = (x, y) => x >= 0 && y >= 0 && x < width && y < height ?
    bytes[5 + y * width + x] : 0
const road = (x, y) => tile(x, y) >= 2
const id = (x, y) => y * width + x
const point = key => [key % width, Math.floor(key / width)]
const context = vm.createContext({
    console, Math, tilemap: s => s[0], assets: { tile: s => s[0] },
    game: { onUpdate() {} },
    tiles: {
        getTilesByType: () => [{ x: 38 * 16 + 8, y: 45 * 16 + 8 }],
        tileAtLocationEquals: (p, name) => name === "raceRoadTile" && tile(p[0], p[1]) === 2
    },
    DrivingSessionState: { Race: 1, Paused: 2 }, drivingSessionState: 1,
    activeRaceDefinition: null, activeRaceCheckpoints: [], raceLap: 0,
    player: { x: 0, y: 0, vx: 0, vy: 0,
        tilemapLocation() { return [Math.floor(this.x / 16), Math.floor(this.y / 16)] } }
})
for (const file of ["race_definitions.ts", "race_progress.ts"]) {
    const source = fs.readFileSync(path.join(root, file), "utf8")
    vm.runInContext(compiler.ts.transpile(source), context, { filename: file })
}
const run = script => vm.runInContext(script, context)
const bounds = run("expertRaceGateBounds")
const contains = (b, x, y) => x >= b[0] && y >= b[1] && x <= b[2] && y <= b[3]
assert.equal(bounds.length, run("expertRaceDefinition.aiCheckpoints.length"))

// Cut the loop at the finish. Each region must span the ENTIRE road: deleting
// any one must disconnect the two sides, including diagonal road connections.
const start = id(39, 45), end = id(37, 45)
const directions = [[1, 0], [0, -1], [-1, 0], [0, 1], [1, 1], [-1, 1], [1, -1], [-1, -1]]
function findPath(from, to, blocked = () => false, order = directions) {
    const queue = [from], previous = new Map([[from, null]])
    for (let i = 0; i < queue.length; i++) {
        const here = queue[i], [x, y] = point(here)
        if (here === to) {
            const result = []
            for (let at = here; at !== null; at = previous.get(at)) result.push(point(at))
            return result.reverse()
        }
        for (const [dx, dy] of order) {
            const nx = x + dx, ny = y + dy, next = id(nx, ny)
            if (!road(nx, ny) || tile(nx, ny) === 4 || blocked(nx, ny) || previous.has(next)) continue
            // Do not cut across grass corners.
            if (dx && dy && (!road(x + dx, y) || !road(x, y + dy))) continue
            previous.set(next, here)
            queue.push(next)
        }
    }
    return null
}
assert.ok(findPath(start, end), "Expert road must form a connected circuit")
for (let i = 0; i < bounds.length; i++) {
    assert.equal(findPath(start, end, (x, y) => contains(bounds[i], x, y)), null,
        `Gate ${i} can be bypassed on the road`)
}
console.log("PASS: all 22 Expert gates span the full road width")

function reset(reverse = false) {
    run(`selectedRaceLayout = ${reverse ? "RaceLayout.Reverse" : "RaceLayout.Forward"};
        activeRaceDefinition = expertRaceDefinition;
        activeRaceCheckpoints = raceCheckpointsForLayout(activeRaceDefinition, selectedRaceLayout);
        raceLap = 0; drivingSessionState = DrivingSessionState.Race;
        prepareRaceRouteProgress();`)
}
function moveAlong(points, speed = 80, allowWrongWay = false) {
    const player = context.player
    player.x = points[0][0] * 16 + 8
    player.y = points[0][1] * 16 + 8
    for (const [x, y] of points.slice(1)) {
        const dx = x * 16 + 8 - player.x, dy = y * 16 + 8 - player.y
        const distance = Math.hypot(dx, dy), steps = Math.ceil(distance / (speed * 0.05))
        player.vx = dx / distance * speed; player.vy = dy / distance * speed
        for (let step = 0; step < steps; step++) {
            player.x += dx / steps; player.y += dy / steps
            run(`updatePlayerRaceRouteProgress(${distance / speed / steps})`)
            if (!allowWrongWay) assert.equal(run("playerRaceWrongWay"), false,
                `False WRONG WAY at ${player.x / 16},${player.y / 16}, gate ${run("playerRaceRouteGateIndex")}`)
        }
    }
}
// Both originally reported wide-corner failures, without visiting AI apexes.
reset()
moveAlong([[35, 44], [62, 44], [62, 36]])
assert.equal(run("playerRaceRouteGatesPassed"), 2)
reset(true)
run("playerRaceRouteGateIndex = 18; playerRaceRouteGatesPassed = 18")
moveAlong([[66, 30], [55, 30], [55, 36]])
assert.equal(run("playerRaceRouteGatesPassed"), 20)
console.log("PASS: forward and reverse wide-corner regressions")

// Shortest road-only paths hug inside corners. Change tie-breaking to exercise
// alternative lanes; run three full laps in both layouts, including finish.
for (const reverse of [false, true]) {
    for (let variant = 0; variant < 8; variant++) {
        reset(reverse)
        const order = directions.slice(variant).concat(directions.slice(0, variant))
        const route = findPath(reverse ? end : start, reverse ? start : end, undefined, order)
        for (let lap = 0; lap < 3; lap++) {
            assert.equal(run("playerRaceRouteIsCompleteForLap()"), false)
            moveAlong(route, variant % 2 ? 240 : 80)
            assert.equal(run("playerRaceRouteGatesPassed"), 22 * (lap + 1))
            assert.equal(run("playerRaceRouteIsCompleteForLap()"), true)
            moveAlong([route.at(-1), [38, 45], route[0]])
            run("raceLap += 1")
        }
    }
}
console.log("PASS: 48 complete laps, both layouts, 80/240 px/s, no false warnings")

for (const reverse of [false, true]) {
    reset(reverse)
    // Reaching later gates/finish cannot credit a missed first gate.
    moveAlong([[38, 45], [38, 44]])
    assert.equal(run("playerRaceRouteGatesPassed"), 0)
    assert.equal(run("playerRaceRouteIsCompleteForLap()"), false)
    // Sustained travel away from the next region still warns.
    moveAlong(reverse ? [[30, 45], [45, 45]] : [[45, 45], [30, 45]], 80, true)
    assert.equal(run("playerRaceWrongWay"), true)
    moveAlong(reverse ? [[45, 45], [30, 45]] : [[30, 45], [45, 45]], 80, true)
    assert.equal(run("playerRaceWrongWay"), false)
    reset(reverse)
    run("drivingSessionState = DrivingSessionState.Paused")
    moveAlong(reverse ? [[7, 45], [4, 45]] : [[60, 45], [65, 45]])
    assert.equal(run("playerRaceRouteGatesPassed"), 0)
}
// A region overlapping grass must not grant credit off the road.
reset()
run("playerRaceRouteGateIndex = 12")
context.player.x = 35 * 16 + 8; context.player.y = 19 * 16 + 8
assert.equal(road(35, 19), false)
run("updatePlayerRaceRouteProgress(0.1)")
assert.equal(run("playerRaceRouteGatesPassed"), 0)
console.log("PASS: skipped gates, off-road, pause, genuine wrong-way and recovery")

for (const reverse of [false, true]) {
    for (let gate = 0; gate < 22; gate++) {
        reset(reverse)
        run(`playerRaceRouteGateIndex = ${gate};
            player.x = raceRouteGatePixelX((${gate} + 1) % 22);
            player.y = raceRouteGatePixelY((${gate} + 1) % 22);
            updatePlayerRaceRouteProgress(0.05);`)
        assert.equal(run("playerRaceRouteGatesPassed"), 0, `Skipped gate ${gate} was credited`)
    }
    reset(reverse)
    run(`player.x = raceRouteGatePixelX(0); player.y = raceRouteGatePixelY(0);
        player.vx = 0; player.vy = 0;`)
    for (let tick = 0; tick < 100; tick++) run("updatePlayerRaceRouteProgress(0.05)")
    assert.equal(run("playerRaceRouteGatesPassed"), 1, "Dwelling must not double-count a gate")
    reset(reverse)
    assert.equal(run("playerRaceRouteGatesPassed"), 0)
    assert.equal(run("playerRaceRouteGateIndex"), 0)
    assert.equal(run("playerRaceWrongWayMilliseconds"), 0)
}
console.log("PASS: every skipped gate rejected, no repeat credit, clean restart")

// Test the extreme subpixel edges, not only tile centres. Arcade sprites have
// Fx8 positions; leaving even a one-pixel gap would permit a missed gate.
for (const reverse of [false, true]) {
    for (let i = 0; i < bounds.length; i++) {
        const b = bounds[i]
        for (let y = b[1]; y <= b[3]; y++) for (let x = b[0]; x <= b[2]; x++) {
            if (tile(x, y) !== 2) continue
            for (const [ox, oy] of [[0, 0], [255 / 256, 255 / 256]]) {
                reset(reverse)
                run(`playerRaceRouteGateIndex = ${reverse ? 21 - i : i}`)
                context.player.x = (x + ox) * 16
                context.player.y = (y + oy) * 16
                run("updatePlayerRaceRouteProgress(0.05)")
                assert.equal(run("playerRaceRouteGatesPassed"), 1, `Missed road edge at ${x},${y}`)
            }
        }
    }
}
reset()
context.player.x = 66 * 16 + 16 - 1 / 256
context.player.y = 47 * 16 + 16 - 1 / 256
run("updatePlayerRaceRouteProgress(0.05)")
assert.equal(run("playerRaceRouteGatesPassed"), 1)

// Unchanged point-gate behavior for the other two difficulties.
for (const difficulty of ["beginnerRaceDefinition", "intermediateRaceDefinition"]) {
    run(`activeRaceDefinition = ${difficulty}; activeRaceCheckpoints = activeRaceDefinition.aiCheckpoints;
        prepareRaceRouteProgress(); player.x = raceRouteGatePixelX(0) - 40;
        player.y = raceRouteGatePixelY(0); updatePlayerRaceRouteProgress(0.05);`)
    assert.equal(run("playerRaceRouteGatesPassed"), 1)
}
console.log("PASS: road-edge coverage and Beginner/Intermediate compatibility")
