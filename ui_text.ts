// Shared fixed-width text fitting for the 160x120 Arcade display

/** Returns text that fits the requested pixel width, with a visible ellipsis. */
function fitArcadeText(text: string, maximumWidth: number, font: image.Font) {
    let maximumCharacters = Math.max(
        1,
        Math.idiv(maximumWidth, font.charWidth)
    )
    if (text.length <= maximumCharacters) {
        return text
    }
    if (maximumCharacters <= 3) {
        return text.substr(0, maximumCharacters)
    }
    return text.substr(0, maximumCharacters - 3) + "..."
}
/** Centers fitted text without allowing a negative drawing coordinate. */
function centeredArcadeTextX(
    targetWidth: number,
    text: string,
    font: image.Font
) {
    return Math.max(0, (targetWidth - text.length * font.charWidth) >> 1)
}
