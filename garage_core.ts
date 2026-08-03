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

/** Shows a paginated list and returns its selected source index, or -1 on Back. */
function showPaginatedGarageMenu(options: string[], pageSize: number) {
    let firstOptionOnPage = 0

    while (garageIsOpen) {
        let pageOptions: string[] = []
        let lastOptionOnPage = Math.min(
            firstOptionOnPage + pageSize,
            options.length
        )

        for (let index = firstOptionOnPage; index < lastOptionOnPage; index++) {
            pageOptions.push(options[index])
        }

        if (firstOptionOnPage > 0) {
            pageOptions.push("Previous")
        }
        if (lastOptionOnPage < options.length) {
            pageOptions.push("More")
        }
        pageOptions.push("Back")

        let selectedOption = showExtendedGarageMenu(pageOptions)
        if (selectedOption == "Previous") {
            firstOptionOnPage = Math.max(0, firstOptionOnPage - pageSize)
        } else if (selectedOption == "More") {
            firstOptionOnPage = lastOptionOnPage
        } else if (selectedOption == "Back") {
            return -1
        } else {
            for (let index = firstOptionOnPage; index < lastOptionOnPage; index++) {
                if (selectedOption == options[index]) {
                    return index
                }
            }
        }
    }

    return -1
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
