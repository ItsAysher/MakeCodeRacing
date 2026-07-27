// Player car parts, equipped upgrades, and calculated performance stats

// Car Part Lists
let engines = ["V1", "V2", "V3"]
let wheelTypes = ["W1", "W2", "W3"]
let carBodies = ["B1", "B2", "B3"]
let brakeTypes = ["BR1", "BR2", "BR3"]

// Engine Stats
let engineSpeeds = [20, 28, 35]
let engineAccelerations = [2, 3, 4]

// Wheel Stats
let wheelSpeeds = [10, 12, 15]
let wheelAccelerations = [1, 2, 3]

// Body Stats
let bodyDurabilities = [40, 60, 100]
let bodyEfficiencies = [60, 80, 100]

// Brake Stats
let brakeSpeeds = [10, 20, 30]

// Current Car Parts
let engine = engines[0]
let wheels = wheelTypes[0]
let body = carBodies[0]
let brakes = brakeTypes[0]

// Player Stats
let rawSpeed = 0
let speed = 0
let acceleration = 0
let brakeSpeed = 0
let durability = 0
let efficiency = 0

function getPartIndex(part: string, partList: string[]) {
    let index = partList.indexOf(part)

    return index
}

function updatePlayerStats() {
    let engineIndex = getPartIndex(engine, engines)
    let wheelIndex = getPartIndex(wheels, wheelTypes)
    let bodyIndex = getPartIndex(body, carBodies)
    let brakeIndex = getPartIndex(brakes, brakeTypes)

    rawSpeed = engineSpeeds[engineIndex] + wheelSpeeds[wheelIndex]
    acceleration = engineAccelerations[engineIndex] + wheelAccelerations[wheelIndex]
    durability = bodyDurabilities[bodyIndex]
    efficiency = bodyEfficiencies[bodyIndex]
    brakeSpeed = brakeSpeeds[brakeIndex]

    // Efficiency controls how much of the engine/wheel speed can be used.
    speed = rawSpeed * efficiency / 100
}