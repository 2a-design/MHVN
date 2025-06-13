$(document).ready(function() {
    // --- Game Settings ---
    let enemyMaxHealth = 2000;
    let enemyCurrentHealth = enemyMaxHealth;
    const damagePerClick = 125;

    let playerMaxHealth = 1000;
    let playerCurrentHealth = playerMaxHealth;
    const fireballDamage = 250;
    
    let gameEnded = false;
    let attackInterval;

    // --- DOM Elements ---
    const dragon = $('#rath-enemy'); // Changed to #rath-enemy
    const enemyHealthBar = $('#health-bar');
    const playerHealthBar = $('#player-health-bar');
    const questCompleteOverlay = $('#quest-complete-overlay');
    const gameOverOverlay = $('#game-over-overlay');
    const damagePopupContainer = $('#damage-popup-container');
    const fireballContainer = $('#fireball-container');
    const screenFlashOverlay = $('#screen-flash-overlay');

    // --- Initialize ---
    questCompleteOverlay.hide();
    gameOverOverlay.hide();
    updateHealthBars();
    
    // Add hitbox to dragon
    const hitbox = $('<div id="rath-hitbox"></div>');
    dragon.append(hitbox);
    
    startDragonAttacks(); // Start dragon attacks
    startDragonAnimation(); // Start dragon sprite animation

    // --- Event Handlers ---
    $('#rath-hitbox').on('click', function(e) { // This should be #rath-hitbox
        if (gameEnded) return;
        enemyCurrentHealth -= damagePerClick;
        if (enemyCurrentHealth < 0) enemyCurrentHealth = 0;
        updateHealthBars();
        showDamagePopup(damagePerClick);
        createSlashEffect(e);
        dragon.addClass('hit');
        setTimeout(() => dragon.removeClass('hit'), 150);

        if (enemyCurrentHealth <= 0) {
            handleVictory();
        }
    });

    // Specific event handler for the "Return to Camp" button on victory screen
    $('#quest-complete-overlay .return-button').on('click', function() {
        window.location.href = 'scene3-conclusion.html'; // CORRECTED PATH: Navigate to scene3-conclusion.html
    });

    // Specific event handler for the "Try Again" button on defeat screen
    $('#game-over-overlay .return-button').on('click', function() {
        window.location.reload(); // Refresh the page
    });

    // --- Game Functions ---
    function updateHealthBars() {
        const enemyHealthPercentage = (enemyCurrentHealth / enemyMaxHealth) * 100;
        enemyHealthBar.css('width', `${enemyHealthPercentage}%`);

        const playerHealthPercentage = (playerCurrentHealth / playerMaxHealth) * 100;
        playerHealthBar.css('width', `${playerHealthPercentage}%`);
    }

    function handleEndState(isVictory) {
        if (gameEnded) return;
        gameEnded = true;
        clearInterval(attackInterval);
        dragon.fadeOut(500);
        $('#enemy-ui-container, #player-ui-container').fadeOut(500);

        setTimeout(() => {
            if (isVictory) {
                questCompleteOverlay.fadeIn(500);
            } else {
                gameOverOverlay.fadeIn(500);
            }
        }, 800);
    }

    function handleVictory() { handleEndState(true); }
    function handleDefeat() { handleEndState(false); }

    function showDamagePopup(damage) {
        const damageText = $(`<div class="damage-popup">${damage}</div>`);
        const xOffset = (Math.random() - 0.5) * 80;
        const yOffset = (Math.random() - 0.5) * 40;
        damageText.css({
            left: `calc(50% + ${xOffset}px)`,
            top: `calc(35% + ${yOffset}px)`, // UPDATED: Initial top position significantly higher
        });
        damagePopupContainer.append(damageText);
        damageText.animate({ top: '-=125px', opacity: 0 }, 1500, 'swing', function() { $(this).remove(); });
    }

    function createSlashEffect(e) {
        const slash = $('<div class="slash-effect"></div>');
        
        // Generate a random angle and convert to radians for path calculation
        const randomAngle = Math.random() * 360;
        const angleRad = (randomAngle * Math.PI) / 180;
        
        // Calculate rotated slash points from center
        const center = { x: 50, y: 50 };
        const length = 45; // Length of the slash from center
        
        const start = {
            x: center.x - Math.cos(angleRad) * length,
            y: center.y - Math.sin(angleRad) * length
        };
        const end = {
            x: center.x + Math.cos(angleRad) * length,
            y: center.y + Math.sin(angleRad) * length
        };
        
        // Create SVG with gradient and slim tapered path
        const svg = `
            <svg viewBox="0 0 100 100">
                <defs>
                    <linearGradient id="slashGradient" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
                        <stop offset="0%" stop-color="#ff0000" />
                        <stop offset="50%" stop-color="#ff6600" />
                        <stop offset="100%" stop-color="#ff0000" />
                    </linearGradient>
                </defs>
                <ellipse cx="50" cy="50" rx="60" ry="0.8" fill="url(#slashGradient)" transform="rotate(${randomAngle}, 50, 50)" />
            </svg>
        `;
        slash.html(svg); // Add this line to insert the SVG into the div
        
        // Add some position variation for more dynamic effect
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = (Math.random() - 0.5) * 40;
        
        slash.css({
            left: e.pageX - 100 + offsetX,
            top: e.pageY - 100 + offsetY
        });
        
        // Add SVG to container and animate
        $('#minigame-container').append(slash);
        slash.addClass('animate');
        
        // Clean up after animation
        setTimeout(() => slash.remove(), 400);
    }

    function startDragonAttacks() {
        attackInterval = setInterval(() => { if (!gameEnded) launchFireball(); }, 4000);
    }

    function launchFireball() {
        const fireball = $('<div class="fireball"></div>');
        fireballContainer.append(fireball);
        fireball.addClass('animate');

        setTimeout(() => {
            if (!gameEnded) {
                screenFlashOverlay.addClass('flash');
                playerCurrentHealth -= fireballDamage;
                if (playerCurrentHealth < 0) playerCurrentHealth = 0;
                updateHealthBars();
                if (playerCurrentHealth <= 0) handleDefeat();
                setTimeout(() => screenFlashOverlay.removeClass('flash'), 500);
            }
        }, 700);

        setTimeout(() => fireball.remove(), 900);
    }

    function startDragonAnimation() {
        const dragonEnemy = $('#rath-enemy'); // Changed to #rath-enemy
        const frameCount = 53; // Total number of frames in the sequence
        const frameRate = 1000 / 60; // 60 FPS (1000ms divided by 60 frames)
        const imagePath = '../../images/animations/rathalos/flying/'; // Path to the PNG sequence
        let currentFrame = 0;

        function updateFrame() {
            // Calculate the current frame's file name
            const frameFileName = `${imagePath}rath-fly${String(currentFrame).padStart(4, '0')}.png`;            // Update the background image of the container
            dragonEnemy.css({
                'background-image': `url(${frameFileName})`
            });

            // Increment the frame counter
            currentFrame = (currentFrame + 1) % frameCount; // Loop back to the first frame
        }

        // Start the animation loop
        setInterval(updateFrame, frameRate);
    }
});