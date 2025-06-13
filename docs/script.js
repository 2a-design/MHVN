$(document).ready(function() {
    let currentLine = 0; 
    let currentSceneData;
    let typewriterInterval = null;
    const TYPEWRITER_DURATION = 1000; 

    if (typeof AudioManager !== 'undefined') {
        AudioManager.ensureBgmPlayer(); 
    } else {
        console.error("AudioManager is not loaded!");
    }

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

    function loadScene(sceneFile) {
        if (!sceneFile) {
            if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
                $('#dialog-text').text("Error: Could not determine scene file from URL.");
                $('#speaker-name').hide();
                $('#next-button').hide();
                $('#choices-container').hide();
            }
            return;
        }

        $.getJSON(sceneFile, function(data) {
            currentSceneData = data;
            currentLine = 0;
            if (currentSceneData && Array.isArray(currentSceneData) && currentSceneData.length > 0) {
                $('#dialog-interface').show();
                displayLine();
                if (currentSceneData[0].bgm && typeof AudioManager !== 'undefined') {
                    AudioManager.playMusic(currentSceneData[0].bgm);
                } else if (typeof AudioManager !== 'undefined') {
                    if (AudioManager.bgmPlayer && !AudioManager.bgmPlayer.paused) {
                        AudioManager.stopMusic();
                    }
                }
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
        let newPath = nextScenePath;
        if (window.location.pathname.includes("/docs/scenes/html/")) {
            newPath = "../../" + nextScenePath;
        }
        window.location.href = newPath;
    }

    function completeTypewriter() {
        if (typewriterInterval) {
            clearInterval(typewriterInterval);
            typewriterInterval = null;
            if (currentSceneData && currentSceneData[currentLine]) {
                $('#dialog-text').text(currentSceneData[currentLine].dialog || "");
            }
            $('.choice-button').removeClass('disabled-while-typing').prop('disabled', false);
        }
    }

    // Handle clicking the "next" button
    $('#next-button').on('click', function() {
        if (typewriterInterval) {
            completeTypewriter();
        }

        let lineObject = currentSceneData[currentLine]; 

        if (lineObject && lineObject.target_id) {
            const targetIndex = currentSceneData.findIndex(dialogLine => dialogLine.id === lineObject.target_id);
            if (targetIndex !== -1) {
                currentLine = targetIndex;
                displayLine();
            } else {
                console.error("NEXT button: target_id not found:", lineObject.target_id);
                currentLine++; 
                if (currentSceneData && currentLine < currentSceneData.length) displayLine(); else endGame();
            }
        } else if (lineObject && lineObject.next_scene) {
            navigateTo(lineObject.next_scene);
        } else {
            currentLine++; 
            if (currentSceneData && currentLine < currentSceneData.length) {
                displayLine();
            } else {
                endGame();
            }
        }
    });
    
    $('#dialog-box').on('click', function(e) {
        if ($(e.target).is('#next-button') || $(e.target).is('.choice-button')) {
            return;
        }
        if (typewriterInterval) {
            completeTypewriter();
        }
        else if (currentSceneData && currentSceneData[currentLine] && !currentSceneData[currentLine].choices) {
            $('#next-button').trigger('click');
        }
    });

    //dialog line display function
    function displayLine() {
        if (typewriterInterval) { 
            clearInterval(typewriterInterval);
            typewriterInterval = null;
        }

        if (!currentSceneData || currentLine < 0 || currentLine >= currentSceneData.length) {
            console.error("Error: Invalid currentLine index or no scene data. Index: " + currentLine);
            if (currentSceneData && currentLine >= currentSceneData.length) { 
                const lastActualLine = currentSceneData[currentSceneData.length - 1];
                if (lastActualLine && lastActualLine.next_scene) { 
                     navigateTo(lastActualLine.next_scene);
                } else if (lastActualLine && lastActualLine.target_id) { 
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
                $('#dialog-text').text("Error: Problem displaying line or scene ended.");
                $('#next-button').hide();
                $('#choices-container').empty().hide();
            }
            return;
        }

        let line = currentSceneData[currentLine];

        // Only disable choice buttons during typewriter; next-button remains active.
        $('.choice-button').addClass('disabled-while-typing').prop('disabled', true);

        if (line.hasOwnProperty('bgm') && typeof AudioManager !== 'undefined') { 
            if (line.bgm === null || line.bgm === "") { 
                AudioManager.stopMusic();
            } else {
                AudioManager.playMusic(line.bgm);
            }
        }

        if (line.background) {
            $('#background').css('background-image', `url(${getImagePath(line.background)})`);
        }

        if (line.speaker && line.speaker.toUpperCase() !== "NARRATOR") {
            $('#speaker-name').text(line.speaker).css('visibility', 'visible');
        } else {
            $('#speaker-name').css('visibility', 'hidden');
        }
        
        const dialogTextElement = $('#dialog-text');
        const textToDisplay = line.dialog || "";
        dialogTextElement.text(""); 

        if (textToDisplay) {
            let charIndex = 0;
            const timePerChar = TYPEWRITER_DURATION / textToDisplay.length;
            typewriterInterval = setInterval(function() {
                dialogTextElement.text(textToDisplay.substring(0, charIndex + 1));
                charIndex++;
                if (charIndex >= textToDisplay.length) {
                    completeTypewriter(); 
                }
            }, timePerChar);
        } else {
            completeTypewriter();
        }

        updateCharacter('#character-left', line.character_left, line.speaking_slot === 'left');
        updateCharacter('#character-right', line.character_right, line.speaking_slot === 'right');

        $('#character-left').removeClass('dimmed speaking');
        $('#character-right').removeClass('dimmed speaking');

        const isLeftCharPresent = !!line.character_left;
        const isRightCharPresent = !!line.character_right;

        if (line.speaking_slot === "left" && isLeftCharPresent) {
            $('#character-left').addClass('speaking');
            if (isRightCharPresent) $('#character-right').addClass('dimmed');
        } else if (line.speaking_slot === "right" && isRightCharPresent) {
            $('#character-right').addClass('speaking');
            if (isLeftCharPresent) $('#character-left').addClass('dimmed');
        } else { 
            if (isLeftCharPresent) $('#character-left').addClass('dimmed');
            if (isRightCharPresent) $('#character-right').addClass('dimmed');
        }
        if (isLeftCharPresent && !isRightCharPresent && line.speaker) {
            $('#character-left').removeClass('dimmed').addClass('speaking');
        }
        if (isRightCharPresent && !isLeftCharPresent && line.speaker) {
            $('#character-right').removeClass('dimmed').addClass('speaking');
        }

        const choicesContainer = $('#choices-container');
        const nextButton = $('#next-button');
        choicesContainer.empty().hide(); 

        if (line.choices && Array.isArray(line.choices) && line.choices.length > 0) {
            nextButton.hide();
            line.choices.forEach(choice => {
                const choiceButton = $('<button class="choice-button"></button>').text(choice.text);
                choiceButton.on('click', function() {
                    if (typewriterInterval) completeTypewriter(); 

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
            if (!typewriterInterval) {
                 $('.choice-button').removeClass('disabled-while-typing').prop('disabled', false);
            }
        } else {
            if (line.target_id || line.next_scene || currentLine < currentSceneData.length - 1) {
                nextButton.show();
                if (!typewriterInterval) {
                    nextButton.removeClass('disabled-while-typing').prop('disabled', false);
                }
            } else {
                nextButton.hide(); 
            }
        }
    }

    function updateCharacter(characterId, imagePath, isSpeaking) {
        const characterElement = $(characterId);
        if (imagePath) {
            characterElement.attr('src', getImagePath(imagePath)).css('opacity', 1);
        } else {
            characterElement.css('opacity', 0).removeClass('speaking dimmed'); 
        }
    }
    
    function endGame() {
        $('#dialog-interface').hide();
        $('#choices-container').empty().hide();
        $('#characters').hide();
        alert("The End (or scene finished without explicit next_scene)");
    }

    $('#character-left').css('opacity', 0);
    $('#character-right').css('opacity', 0);
    $('#choices-container').hide();
    const sceneFileToLoad = getSceneFile();

    if ($('#title-screen-container').length) {
        // Logic for title screen is in titlescript.js
    } else {
        loadScene(sceneFileToLoad);
    }
});
