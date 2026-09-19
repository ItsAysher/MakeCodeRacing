// Player part catalog, ownership, and equipped loadout.
//
// Every part array is ordered by tier: index 0 is Tier 1, index 1 is Tier 2,
// and index 2 is Tier 3. Equipped parts are stored as tier indexes so stat
// calculations never need to search for a display name.

let engineNames = ["V1", "V2", "V3"]
let wheelNames = ["W1", "W2", "W3"]
let bodyNames = ["B1", "B2", "B3"]
let brakeNames = ["BR1", "BR2", "BR3"]

// Tier 1 parts are owned at the start. Higher-tier parts are purchased
// separately for each category.
let partPrices = [0, 250, 900]
let engineUnlocked = [true, false, false]
let wheelsUnlocked = [true, false, false]
let bodyUnlocked = [true, false, false]
let brakesUnlocked = [true, false, false]

// Engine and wheels combine to produce raw speed and acceleration ratings.
let engineSpeedRatings = [20, 28, 35]
let engineAccelerationRatings = [2, 3, 4]
let wheelSpeedRatings = [10, 12, 15]
let wheelAccelerationRatings = [1, 2, 3]

// Body controls maximum durability and the percentage of raw speed that the
// car can use. Brakes provide the braking rating.
let bodyMaximumDurabilities = [40, 60, 100]
let bodyEfficiencyPercents = [60, 80, 100]
let brakeRatings = [10, 20, 30]

let equippedEngineTier = 0
let equippedWheelTier = 0
let equippedBodyTier = 0
let equippedBrakeTier = 0
