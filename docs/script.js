$(document).ready(function() {
    let currentLine = 0;
    let currentSceneData;

    //adjust image paths based on html location. kinda ass but it lets my file structure be cleaner
    function getImagePath(originalPath) {
        if (!originalPath) {
            return null;
        }
        const currentHtmlPath = window.location.pathname;
        // check if current html page is in scenes/html/
        if (currentHtmlPath.includes('/scenes/html/')) {
            return `../../${originalPath}`;
        }
        // if html is in root, path is already correct
        return originalPath;
    }

    // determine which json to load based on the html filename
    function getSceneFile() {
        const currentHtmlPath = window.location.pathname;
        let pageNameWithExtension = currentHtmlPath.split("/").pop(); 

        // should fix github pages for index
        if (pageNameWithExtension === '') {
            pageNameWithExtension = 'index.html';
        }

        const sceneName = pageNameWithExtension.replace('.html', ''); 

        if (!sceneName) {
            console.error("Could not determine scene name from path:", currentHtmlPath);
            return null;
        }

        // construct path to json file based on html location
        if (currentHtmlPath.includes('/scenes/html/')) {
            // for html in scenes/html/, json is in ../ (scenes/ folder)
            return `../${sceneName}.json`;
        } else {
            // for html in root (index.html), json is in scenes/
            return `scenes/${sceneName}.json`;
        }
    }

    //scene loader
    function loadScene(sceneFile) {
        if (!sceneFile) {
            $('#dialog-text').text("Error: Could not determine scene file from URL.");
            return;
        }

        $.getJSON(sceneFile, function(data) {
            currentSceneData = data;
            currentLine = 0; 
            $('#dialog-interface').show(); 
            $('#next-button').show(); 
            displayLine(); 
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error("Error loading scene: " + sceneFile, textStatus, errorThrown);
            // display a more specific error if possible, or the generic one
            let errorMsg = "Error: Could not load scene data for " + sceneFile.split('/').pop();
            if (jqXHR.status === 404) {
                errorMsg = "Error: Scene file not found: " + sceneFile;
            }
            $('#dialog-text').text(errorMsg);
            $('#speaker-name').hide();
            $('#next-button').hide(); 
        });
    }

    // Handle clicking the "next" button
    $('#next-button').on('click', function() {
        currentLine++;
        if (currentSceneData && currentLine < currentSceneData.length) {
            displayLine();
        } else {
            // scene is over, check for the next scene property
            const lastLine = currentSceneData[currentSceneData.length - 1];
            if (lastLine.next_scene) {
                // navigate to the next html page
                // next_scene paths are relative to the root, e.g., "scenes/html/scene2.html"
                // If current page is in scenes/html/, we need to adjust.
                const currentHtmlPath = window.location.pathname;
                if (currentHtmlPath.includes('/scenes/html/')) {
                    window.location.href = `../../${lastLine.next_scene}`;
                } else {
                    window.location.href = lastLine.next_scene;
                }
            } else {
                // no next scene defined, this is the end
                $('#dialog-interface').hide();
                $('#characters').hide();
                alert("The End"); // Consider replacing alert with a custom UI element
            }
        }
    });

    //dialog line
    function displayLine() {
        if (!currentSceneData || !currentSceneData[currentLine]) {
            console.error("Error: Scene data or current line is missing.");
            return;
        }
        let line = currentSceneData[currentLine];

        //change bg
        if (line.background) {
            $('#background').css('background-image', `url(${getImagePath(line.background)})`);
        }

        //change speaker visibility if not narrator
        if (line.speaker && line.speaker.toUpperCase() !== "NARRATOR") {
            $('#speaker-name').text(line.speaker).css('visibility', 'visible');
        } else {
            $('#speaker-name').css('visibility', 'hidden');
        }
        
        //change dialog
        $('#dialog-text').text(line.dialog);

        //change sprites
        updateCharacter('#character-left', line.character_left);
        updateCharacter('#character-right', line.character_right);

        //dim non-speakers
        $('#character-left').removeClass('dimmed');
        $('#character-right').removeClass('dimmed');

        const isLeftCharPresent = !!line.character_left;
        const isRightCharPresent = !!line.character_right;

        if (isLeftCharPresent && isRightCharPresent) { 
            if (line.speaking_slot === "left") {
                //when left speaks, dim right
                $('#character-right').addClass('dimmed');
            } else if (line.speaking_slot === "right") {
                //when right speaks, dim left
                $('#character-left').addClass('dimmed');
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
    const sceneFileToLoad = getSceneFile();
    loadScene(sceneFileToLoad);
});
