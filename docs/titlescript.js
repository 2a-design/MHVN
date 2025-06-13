$(document).ready(function() {
    if ($('#title-screen-container').length) {

        let titleScene, titleCamera, titleRenderer, titlePanorama, titleCanvas;
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let titleAnimationRequest;

        const chapters = [
            { name: "01: Intro", file: "scenes/html/scene1.html" },
            { name: "02: Tracking", file: "scenes/html/tracking.html" },
            { name: "03: Hunting", file: "scenes/html/minigame.html" },
            { name: "04: Debrief", file: "scenes/html/scene3-conclusion.html" },
        ];

        let chapterOverlay, chapterPanel, chapterListULElement;

        function populateChapterList() {
            if (!chapterListULElement || chapterListULElement.length === 0) {
                console.error("Chapter list UL element is not available for population.");
                return;
            }
            chapterListULElement.empty();
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

            chapterOverlay = $('#chapter-select-overlay');

            if (chapterOverlay.length === 0) { 
                chapterOverlay = $('<div id="chapter-select-overlay"></div>').hide();
                chapterPanel = $('<div id="chapter-select-panel"></div>');
                chapterListULElement = $('<ul id="chapter-list"></ul>');

                chapterPanel.append(chapterListULElement);
                chapterOverlay.append(chapterPanel);
                $('body').append(chapterOverlay);
            } else { 
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

            populateChapterList();

            $('#chapter-select-button').off('click').on('click', function(e) {
                e.stopPropagation();
                chapterOverlay.css('display', 'flex');
            });

            chapterOverlay.on('click', function(e) {
                if ($(e.target).is('#chapter-select-overlay')) {
                    chapterOverlay.hide();
                }
            });

            if (chapterListULElement) {
                chapterListULElement.off('click', 'a').on('click', 'a', function(e) {
                    e.preventDefault();
                    const targetUrl = $(this).data('href');
                    if (targetUrl) {
                        window.location.href = targetUrl;
                    }
                    chapterOverlay.hide();
                });
            }
            
            $(document).off('click.chapterDropdown'); 
        }

        $('#play-button').on('click', function() {
            if (chapters.length > 0) {
                window.location.href = chapters[0].file;
            } else {
                window.location.href = 'scenes/html/scene1.html';
            }
        });

        //threejs stuff
        function initTitle3DBackground() {
            titleCanvas = document.createElement('canvas');
            titleCanvas.id = 'title-bg-canvas';
            $('#title-screen-container').prepend(titleCanvas);

            titleScene = new THREE.Scene();
            //fov determines zoom (40 = fullscreen)
            titleCamera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
            titleRenderer = new THREE.WebGLRenderer({ canvas: titleCanvas, antialias: true, alpha: true });
            titleRenderer.setSize(window.innerWidth, window.innerHeight);
            titleRenderer.setClearColor(0x000000, 0);

            const textureLoader = new THREE.TextureLoader();
            const texture = textureLoader.load('images/pano/plains-pano.png', (loadedTexture) => {
                const imageAspect = loadedTexture.image.width / loadedTexture.image.height;
                const cylinderHeight = 100;
                const cylinderRadius = (cylinderHeight * imageAspect) / (2 * Math.PI);

                const geometry = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 64, 1, true);
                loadedTexture.mapping = THREE.UVMapping;
                loadedTexture.wrapS = THREE.RepeatWrapping;
                loadedTexture.repeat.x = -1;

                const material = new THREE.MeshBasicMaterial({ map: loadedTexture, side: THREE.BackSide });
                titlePanorama = new THREE.Mesh(geometry, material);
                titlePanorama.position.y = cylinderHeight / 2;
                titleScene.add(titlePanorama);

                titleCamera.position.set(0, cylinderHeight / 2, 0.1);
                titleCamera.lookAt(new THREE.Vector3(0, cylinderHeight / 2, -1));
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
                if (titlePanorama && !isDragging) { //auto rotate when not dragging
                    titlePanorama.rotation.y += 0.0005; // auto rotate speed
                }
                titleRenderer.render(titleScene, titleCamera);
            }
        }

        initChapterSelectModal();
        initTitle3DBackground();

        if (typeof AudioManager !== 'undefined') {
            AudioManager.ensureBgmPlayer();
        }
    }
});