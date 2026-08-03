// Directional base and paint-layer image catalogs for every car body

// Every image array is ordered up, down, left, right.
enum CarImageDirection {
    Up,
    Down,
    Left,
    Right
}

let carBody1Images = [
    assets.image`body1Up`,
    assets.image`body1Down`,
    assets.image`body1Left`,
    assets.image`body1Right`
]
let carBody2Images = [
    assets.image`body2Up`,
    assets.image`body2Down`,
    assets.image`body2Left`,
    assets.image`body2Right`
]
let carBody3Images = [
    assets.image`body3Up`,
    assets.image`body3Down`,
    assets.image`body3Left`,
    assets.image`body3Right`
]

let carBody1PrimaryImages = [
    assets.image`body1UpPrimary`,
    assets.image`body1DownPrimary`,
    assets.image`body1LeftPrimary`,
    assets.image`body1RightPrimary`
]
let carBody2PrimaryImages = [
    assets.image`body2UpPrimary`,
    assets.image`body2DownPrimary`,
    assets.image`body2LeftPrimary`,
    assets.image`body2RightPrimary`
]
let carBody3PrimaryImages = [
    assets.image`body3UpPrimary`,
    assets.image`body3DownPrimary`,
    assets.image`body3LeftPrimary`,
    assets.image`body3RightPrimary`
]

let carBody1SecondaryImages = [
    assets.image`body1UpSecondary`,
    assets.image`body1DownSecondary`,
    assets.image`body1LeftSecondary`,
    assets.image`body1RightSecondary`
]
let carBody2SecondaryImages = [
    assets.image`body2UpSecondary`,
    assets.image`body2DownSecondary`,
    assets.image`body2LeftSecondary`,
    assets.image`body2RightSecondary`
]
let carBody3SecondaryImages = [
    assets.image`body3UpSecondary`,
    assets.image`body3DownSecondary`,
    assets.image`body3LeftSecondary`,
    assets.image`body3RightSecondary`
]

let carBody1AccentImages = [
    assets.image`body1UpAccent`,
    assets.image`body1DownAccent`,
    assets.image`body1LeftAccent`,
    assets.image`body1RightAccent`
]
let carBody2AccentImages = [
    assets.image`body2UpAccent`,
    assets.image`body2DownAccent`,
    assets.image`body2LeftAccent`,
    assets.image`body2RightAccent`
]
let carBody3AccentImages = [
    assets.image`body3UpAccent`,
    assets.image`body3DownAccent`,
    assets.image`body3LeftAccent`,
    assets.image`body3RightAccent`
]

let allCarBodyImages = [
    carBody1Images,
    carBody2Images,
    carBody3Images
]
let allCarBodyPrimaryImages = [
    carBody1PrimaryImages,
    carBody2PrimaryImages,
    carBody3PrimaryImages
]
let allCarBodySecondaryImages = [
    carBody1SecondaryImages,
    carBody2SecondaryImages,
    carBody3SecondaryImages
]
let allCarBodyAccentImages = [
    carBody1AccentImages,
    carBody2AccentImages,
    carBody3AccentImages
]
