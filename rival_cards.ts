// Compact code-native pre-race field card

function printCenteredOnRivalCard(
    target: Image,
    text: string,
    top: number,
    color: number,
    font: image.Font
) {
    let fitted = fitArcadeText(text, target.width - 12, font)
    target.print(
        fitted,
        centeredArcadeTextX(target.width, fitted, font),
        top,
        color,
        font
    )
}

/** Names the selected field and uses each rival's deterministic paint colors. */
function createRaceFieldCard(difficulty: RaceDifficulty) {
    let definition = raceDefinitionForDifficulty(difficulty)
    let card = image.create(160, 120)
    let accent = [7, 4, 2][difficulty]
    let cellWidth = Math.idiv(148, definition.aiCount)

    card.fill(12)
    card.fillRect(3, 3, 154, 114, 1)
    card.drawRect(3, 3, 154, 114, accent)
    card.fillRect(6, 6, 148, 10, accent)
    printCenteredOnRivalCard(
        card,
        definition.name + " " + raceLayoutShortLabel(selectedRaceLayout),
        7,
        15,
        image.font8
    )
    printCenteredOnRivalCard(
        card,
        definition.lapTarget + (definition.lapTarget == 1 ?
            " LAP" : " LAPS") + "  $" + definition.prize,
        18,
        15,
        image.font5
    )

    for (let index = 0; index < definition.aiCount; index++) {
        let left = 6 + index * cellWidth
        let colors = aiRacerPaintColors(difficulty, index)
        let profile = aiRacerProfileForDifficulty(difficulty, index)
        card.fillRect(left, 27, cellWidth - 2, 25, colors[0])
        card.drawRect(left, 27, cellWidth - 2, 25, 15)
        card.fillRect(left + 2, 29, cellWidth - 6, 5, colors[1])
        card.print(
            fitArcadeText(profile.name, cellWidth - 4, image.font5),
            left + 2,
            40,
            15,
            image.font5
        )
    }
    return card
}
