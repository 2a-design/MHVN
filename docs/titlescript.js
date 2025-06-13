$(document).ready(function() {
    // Check if we are on the title screen
    if ($('#title-screen-container').length) {

        // --- Three.js Title Screen Background Globals ---
        let titleScene, titleCamera, titleRenderer, titlePanorama, titleCanvas;
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let titleAnimationRequest;

        // --- Chapters ---
        // This would ideally be populated dynamically, but for this snapshot,
        // let's assume a predefined list or that the dynamic population logic
        // was part of what was moved.
        const chapters = [
            { name: "01: Intro", file: "scenes/html/scene1.html" },
            { name: "02: Tracking", file: "scenes/html/tracking.html" },
            { name: "03: Hunting", file: "scenes/html/minigame.html" },
            { name: "04: Debrief", file: "scenes/html/scene3-conclusion.html" },
            // Add other scenes here
        ];

        // --- Chapter Selection Modal ---
        let chapterOverlay, chapterPanel, chapterListULElement; // chapterListULElement will be the UL for chapters
        // const chapterListUL = $('#chapter-list'); // Removed: No longer relying on pre-existing UL from HTML for modal content

        function populateChapterList() {
            // Ensure chapterListULElement is valid and ready
            if (!chapterListULElement || chapterListULElement.length === 0) {
                console.error("Chapter list UL element is not available for population.");
                return;
            }
            chapterListULElement.empty(); // Clear existing items
            chapters.forEach(chapter => {
                const listItem = $('<li><a href="javascript:void(0);" data-href="' + chapter.file + '">' + chapter.name + '</a></li>');
                chapterListULElement.append(listItem);
            });
        }

        function initChapterSelectModal() {
            if ($('#chapter-select-button').length === 0) {
                console.error("#chapter-select-button not found. Cannot initialize chapter select modal.");
                return; 
            }

            // Attempt to find existing modal elements first
            chapterOverlay = $('#chapter-select-overlay');

            if (chapterOverlay.length === 0) { // If overlay doesn't exist, create everything
                chapterOverlay = $('<div id="chapter-select-overlay"></div>').hide();
                chapterPanel = $('<div id="chapter-select-panel"></div>');
                chapterListULElement = $('<ul id="chapter-list"></ul>'); // Create the UL dynamically

                chapterPanel.append(chapterListULElement);
                chapterOverlay.append(chapterPanel);
                $('body').append(chapterOverlay);
            } else { // Overlay exists, try to find panel and list
                chapterPanel = chapterOverlay.find('#chapter-select-panel');
                if (chapterPanel.length === 0) { 
                    console.warn("#chapter-select-panel not found in existing overlay. Recreating panel and list.");
                    chapterPanel = $('<div id="chapter-select-panel"></div>');
                    chapterListULElement = $('<ul id="chapter-list"></ul>');
                    chapterPanel.append(chapterListULElement);
                    chapterOverlay.empty().append(chapterPanel); 
                } else { 
                    chapterListULElement = chapterPanel.find('#chapter-list');
                    if (chapterListULElement.length === 0) {
                        console.warn("#chapter-list UL not found in existing panel. Creating it.");
                        chapterListULElement = $('<ul id="chapter-list"></ul>');
                        chapterPanel.append(chapterListULElement);
                    }
                }
            }

            populateChapterList(); // Populate chapters

            // Event handler for showing the modal
            $('#chapter-select-button').off('click').on('click', function(e) {
                e.stopPropagation();
                // populateChapterList(); // Re-populate if chapters can change; for now, they are constant.
                chapterOverlay.css('display', 'flex');
            });

            // Event handler for hiding modal on overlay click
            chapterOverlay.on('click', function(e) {
                if ($(e.target).is('#chapter-select-overlay')) {
                    chapterOverlay.hide();
                }
            });

            // Event handler for chapter selection (delegated to the list UL)
            if (chapterListULElement) { // Ensure it's defined before attaching handler
                chapterListULElement.off('click', 'a').on('click', 'a', function(e) {
                    e.preventDefault();
                    const targetUrl = $(this).data('href');
                    if (targetUrl) {
                        window.location.href = targetUrl;
                    }
                    chapterOverlay.hide();
                });
            }
            
            // Clean up old dropdown-specific click-outside-to-close handler if it existed
            $(document).off('click.chapterDropdown'); 
        }


        // --- Event Handlers ---
        $('#play-button').on('click', function() {
            if (chapters.length > 0) {
                window.location.href = chapters[0].file;
            } else {
                window.location.href = 'scenes/html/scene1.html';
            }
        });

        // $('#chapter-select-button').on('click', function(e) { // This is now handled in initChapterSelectModal
        // e.stopPropagation(); 
        // chapterList.toggle(); 
        // });

        // Hide chapter list if clicking outside // THIS IS OLD DROPDOWN LOGIC
        // $(document).on('click', function(e) { // OLD DROPDOWN LOGIC
            // Check if the chapterList is visible and the click is outside the button and the list itself
            // if (chapterList.is(':visible') &&  // chapterList was the old dropdown UL
                // !$(e.target).closest('#chapter-list').length &&
                // !$(e.target).is('#chapter-select-button') &&
                // !$(e.target).closest('#chapter-select-button').length) {
                // chapterList.hide(); // OLD DROPDOWN LOGIC
            // }
        // }); // OLD DROPDOWN LOGIC

        // --- Title Screen 3D Background ---
        function initTitle3DBackground() {
            titleCanvas = document.createElement('canvas');
            titleCanvas.id = 'title-bg-canvas';
            $('#title-screen-container').prepend(titleCanvas); // Prepend to be behind other elements

            titleScene = new THREE.Scene();
            titleCamera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
            titleRenderer = new THREE.WebGLRenderer({ canvas: titleCanvas, antialias: true, alpha: true });
            titleRenderer.setSize(window.innerWidth, window.innerHeight);
            titleRenderer.setClearColor(0x000000, 0); // Transparent background

            const textureLoader = new THREE.TextureLoader();
            // Assuming a specific title screen panorama image
            const texture = textureLoader.load('images/pano/plains-pano.png', (loadedTexture) => {
                const imageAspect = loadedTexture.image.width / loadedTexture.image.height;
                const cylinderHeight = 100;
                const cylinderRadius = (cylinderHeight * imageAspect) / (2 * Math.PI);

                const geometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 64, 1, true);
                loadedTexture.mapping = THREE.UVMapping;
                loadedTexture.wrapS = THREE.RepeatWrapping;
                loadedTexture.repeat.x = -1; // Flip texture horizontally

                const material = new THREE.MeshBasicMaterial({ map: loadedTexture, side: THREE.BackSide });
                titlePanorama = new THREE.Mesh(geometry, material);
                titlePanorama.position.y = cylinderHeight / 2;
                titleScene.add(titlePanorama);

                titleCamera.position.set(0, cylinderHeight / 2, 0.1); // Slightly inside to see texture
                titleCamera.lookAt(new THREE.Vector3(0, cylinderHeight / 2, -1)); // Look forward
            });

            $(titleCanvas).on('mousedown', function(e) {
                isDragging = true;
                previousMousePosition.x = e.clientX;
                previousMousePosition.y = e.clientY;
            });

            $(document).on('mouseup', function() {
                isDragging = false;
            });

            $(document).on('mousemove', function(e) {
                if (isDragging && titlePanorama) {
                    const deltaMove = {
                        x: e.clientX - previousMousePosition.x,
                        y: e.clientY - previousMousePosition.y
                    };
                    titlePanorama.rotation.y += deltaMove.x * 0.005;
                    previousMousePosition.x = e.clientX;
                    previousMousePosition.y = e.clientY;
                }
            });

            window.addEventListener('resize', onTitleWindowResize, false);
            animateTitle3DBackground();
        }

        function onTitleWindowResize() {
            if (titleCamera && titleRenderer) {
                titleCamera.aspect = window.innerWidth / window.innerHeight;
                titleCamera.updateProjectionMatrix();
                titleRenderer.setSize(window.innerWidth, window.innerHeight);
            }
        }

        function animateTitle3DBackground() {
            titleAnimationRequest = requestAnimationFrame(animateTitle3DBackground);
            if (titleRenderer && titleScene && titleCamera) {
                // Add auto-rotation
                if (titlePanorama && !isDragging) { // Only auto-rotate if not dragging
                    titlePanorama.rotation.y += 0.0005; // Adjust speed as needed
                }
                titleRenderer.render(titleScene, titleCamera);
            }
        }

        // Initialize title screen specific features
        // populateChapterList(); // Old direct call for dropdown
        initChapterSelectModal(); // Initialize new modal system
        initTitle3DBackground();

        // Ensure AudioManager is available if used on title screen
        if (typeof AudioManager !== 'undefined') {
            AudioManager.ensureBgmPlayer();
            // Example: Play title music if defined
            // AudioManager.playMusic('audio/bgm/title_theme.mp3');
        }
    }
});