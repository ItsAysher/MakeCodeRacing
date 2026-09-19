// Shared Garage state, backgrounds, menus, and lifecycle

enum GarageBackground {
    Main,
    Engine,
    Wheels,
    Body,
    Brakes
}

let garageIsOpen = false

/** Shows a blocking storytelling menu with any number of options. */
function showExtendedGarageMenu(options: string[]) {
    story._currentCutscene().showMenu(options)
    return story.getLastAnswer()
}

/**
 * Shows a list without ever exceeding Story's four visible menu slots.
 * Long lists always reserve slot three for More and slot four for Back.
 */
function showPaginatedGarageMenu(options: string[]) {
    if (options.length == 0) {
        return -1
    }

    if (options.length <= 2) {
        let shortOptions: string[] = []
        for (let option of options) {
            shortOptions.push(option)
        }
        shortOptions.push("Back")
        let shortSelection = showExtendedGarageMenu(shortOptions)
        if (shortSelection == "Back") {
            return -1
        }
        for (let index = 0; index < options.length; index++) {
            if (shortSelection == options[index]) {
                return index
            }
        }
        return -1
    }

    let page = 0
    let pageCount = Math.idiv(options.length + 1, 2)
    while (true) {
        let firstIndex = page * 2
        let secondIndex = firstIndex + 1
        let pageOptions: string[] = [options[firstIndex]]

        if (secondIndex < options.length) {
            pageOptions.push(options[secondIndex])
        } else {
            // Keep More and Back in their predictable third and fourth slots.
            pageOptions.push("Previous")
        }
        pageOptions.push("More")
        pageOptions.push("Back")

        let selectedOption = showExtendedGarageMenu(pageOptions)
        if (selectedOption == "Previous") {
            page = (page + pageCount - 1) % pageCount
        } else if (selectedOption == "More") {
            page = (page + 1) % pageCount
        } else if (selectedOption == "Back") {
            return -1
        } else if (selectedOption == options[firstIndex]) {
            return firstIndex
        } else if (secondIndex < options.length &&
            selectedOption == options[secondIndex]) {
            return secondIndex
        }
    }
}

function setGarageBackground(background: GarageBackground) {
    if (background == GarageBackground.Engine) {
        scene.setBackgroundImage(assets.image`garage-engine-background`)
    } else if (background == GarageBackground.Wheels) {
        scene.setBackgroundImage(assets.image`garage-wheels-background`)
    } else if (background == GarageBackground.Body) {
        scene.setBackgroundImage(assets.image`garage-body-background`)
    } else if (background == GarageBackground.Brakes) {
        scene.setBackgroundImage(assets.image`garage-brakes-background`)
    } else {
        scene.setBackgroundImage(assets.image`garage-main-background`)
    }
}

/** Opens the Garage in a cutscene and starts the selected mode after it closes. */
function openGarage(afterGarage: () => void) {
    if (garageIsOpen) {
        return
    }

    let previousBackground = scene.backgroundImage()

    story.startCutscene(function () {
        showGarage()
        scene.setBackgroundImage(previousBackground)
        afterGarage()
    })
}
