$(document).ready(function() {
    let currentLine = 0; // Index of the current line in currentSceneData
    let currentSceneData;

    //adjust image paths based on html location.
    function getImagePath(originalPath) {
        if (!originalPath) {
            return null;
        }
        const currentHtmlPath = window.location.pathname;
        if (currentHtmlPath.includes('/scenes/html/')) {
            return `../../${originalPath}`;
        }
        return originalPath;
    }

    // determine which json to load based on the html filename
    function getSceneFile() {
        const currentHtmlPath = window.location.pathname;
        let pageNameWithExtension = currentHtmlPath.split("/").pop(); 
        if (pageNameWithExtension === '' || pageNameWithExtension === undefined) {
            pageNameWithExtension = 'index.html';
        }
        const sceneName = pageNameWithExtension.replace('.html', ''); 
        if (!sceneName) {
            console.error("Could not determine scene name from path:", currentHtmlPath);
            return null;
        }
        if (currentHtmlPath.includes('/scenes/html/')) {
            return `../${sceneName}.json`;
        } else {
            return `scenes/${sceneName}.json`;
        }
    }

    //scene loader
    function loadScene(sceneFile) {
        if (!sceneFile) {
            $('#dialog-text').text("Error: Could not determine scene file from URL.");
            $('#speaker-name').hide();
            $('#next-button').hide();
            $('#choices-container').hide();
            return;
        }

        $.getJSON(sceneFile, function(data) {
            currentSceneData = data; 
            currentLine = 0; 
            if (currentSceneData && Array.isArray(currentSceneData) && currentSceneData.length > 0) {
                $('#dialog-interface').show();
                displayLine(); 
            } else {
                $('#dialog-text').text("Error: Scene data is empty or not an array.");
                $('#speaker-name').hide();
                $('#next-button').hide();
                $('#choices-container').hide();
                console.error("Scene data is invalid:", currentSceneData);
            }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error("Error loading scene: " + sceneFile, textStatus, errorThrown);
            let errorMsg = "Error: Could not load scene data for " + sceneFile.split('/').pop();
            if (jqXHR.status === 404) {
                errorMsg = "Error: Scene file not found: " + sceneFile;
            }
            $('#dialog-text').text(errorMsg);
            $('#speaker-name').hide();
            $('#next-button').hide(); 
            $('#choices-container').hide();
        });
    }
    
    function navigateTo(nextScenePath) {
        const currentHtmlPath = window.location.pathname;
        if (currentHtmlPath.includes('/scenes/html/')) {
            window.location.href = `../../${nextScenePath}`;
        } else {
            window.location.href = nextScenePath;
        }
    }

    function endGame() {
        $('#dialog-interface').hide();
        $('#choices-container').empty().hide();
        $('#characters').hide();
        alert("The End"); 
    }

    // Handle clicking the "next" button
    $('#next-button').on('click', function() {
        let lineObject = currentSceneData[currentLine];

        if (lineObject && lineObject.target_id) {
            // If the current line has a target_id, jump to that line
            const targetIndex = currentSceneData.findIndex(dialogLine => dialogLine.id === lineObject.target_id);
            if (targetIndex !== -1) {
                currentLine = targetIndex;
                displayLine();
            } else {
                console.error("NEXT button: target_id not found:", lineObject.target_id);
                currentLine++; // Fallback to sequential
                if (currentSceneData && currentLine < currentSceneData.length) {
                    displayLine();
                } else {
                    endGame();
                }
            }
        } else if (lineObject && lineObject.next_scene) {
            // If the current line itself has a next_scene property, navigate immediately
            navigateTo(lineObject.next_scene);
        } else {
            // No target_id or next_scene on the current line, so try to advance sequentially
            currentLine++; // Advance to the next line index
            if (currentSceneData && currentLine < currentSceneData.length) {
                displayLine();
            } else {
                // Reached end of array, and the previously displayed line didn't have a next_scene or target_id
                endGame();
            }
        }
    });
    
    //dialog line display function
    function displayLine() {
        if (!currentSceneData || currentLine < 0 || currentLine >= currentSceneData.length) {
            console.error("Error: Invalid currentLine index or no scene data. Index: " + currentLine);
            if (currentSceneData && currentLine >= currentSceneData.length) { 
                const lastActualLine = currentSceneData[currentSceneData.length - 1];
                if (lastActualLine && lastActualLine.next_scene) { 
                     navigateTo(lastActualLine.next_scene);
                } else if (lastActualLine && lastActualLine.target_id) { // Check if last line had a target_id for NEXT
                    const targetIndex = currentSceneData.findIndex(dialogLine => dialogLine.id === lastActualLine.target_id);
                    if (targetIndex !== -1) {
                        currentLine = targetIndex;
                        displayLine();
                    } else {
                        endGame();
                    }
                }
                else {
                     endGame();
                }
            } else { 
                $('#dialog-text').text("Error: Problem displaying line.");
                $('#next-button').hide();
                $('#choices-container').empty().hide();
            }
            return;
        }

        let line = currentSceneData[currentLine];

        if (line.background) {
            $('#background').css('background-image', `url(${getImagePath(line.background)})`);
        }

        if (line.speaker && line.speaker.toUpperCase() !== "NARRATOR") {
            $('#speaker-name').text(line.speaker).css('visibility', 'visible');
        } else {
            $('#speaker-name').css('visibility', 'hidden');
        }
        
        $('#dialog-text').text(line.dialog);

        updateCharacter('#character-left', line.character_left);
        updateCharacter('#character-right', line.character_right);

        $('#character-left').removeClass('dimmed');
        $('#character-right').removeClass('dimmed');
        const isLeftCharPresent = !!line.character_left;
        const isRightCharPresent = !!line.character_right;
        if (isLeftCharPresent && isRightCharPresent) { 
            if (line.speaking_slot === "left") {
                $('#character-right').addClass('dimmed');
            } else if (line.speaking_slot === "right") {
                $('#character-left').addClass('dimmed');
            }
        }

        const choicesContainer = $('#choices-container');
        const nextButton = $('#next-button');
        choicesContainer.empty().hide(); 

        if (line.choices && Array.isArray(line.choices) && line.choices.length > 0) {
            nextButton.hide();
            line.choices.forEach(choice => {
                const choiceButton = $('<button class="choice-button"></button>').text(choice.text);
                choiceButton.on('click', function() {
                    if (choice.target_id) {
                        const targetIndex = currentSceneData.findIndex(dialogLine => dialogLine.id === choice.target_id);
                        if (targetIndex !== -1) {
                            currentLine = targetIndex;
                            displayLine();
                        } else {
                            console.error("Choice target_id not found:", choice.target_id);
                            currentLine++; 
                            if(currentLine < currentSceneData.length) displayLine(); else endGame();
                        }
                    } else if (choice.next_scene) {
                        navigateTo(choice.next_scene);
                    } else {
                        console.warn("Choice has no target_id or next_scene:", choice);
                        currentLine++; 
                        if(currentLine < currentSceneData.length) displayLine(); else endGame();
                    }
                });
                choicesContainer.append(choiceButton);
            });
            choicesContainer.show();
        } else {
            // No choices on this line. Show "NEXT" button if:
            // 1. This line itself has a target_id (to jump) OR
            // 2. This line itself has a next_scene property OR
            // 3. There is a next line in the array.
            if (line.target_id || line.next_scene || currentLine < currentSceneData.length - 1) {
                nextButton.show();
            } else {
                // This is the last line of the array AND it has no target_id or next_scene.
                nextButton.hide(); 
            }
        }
    }

    function updateCharacter(characterId, imagePath) {
        if (imagePath) {
            $(characterId).attr('src', getImagePath(imagePath)).css('opacity', 1);
        } else {
            $(characterId).css('opacity', 0);
        }
    }

    // initial setup
    $('#character-left').css('opacity', 0);
    $('#character-right').css('opacity', 0);
    $('#choices-container').hide(); 
    const sceneFileToLoad = getSceneFile();
    loadScene(sceneFileToLoad);
});
