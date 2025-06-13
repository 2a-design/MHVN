const AudioManager = {
    masterVolume: 1.0, // Default volume
    bgmPlayer: null,
    sfxPlayers: [],
    maxSfxPlayers: 10, 

    // Ensure BGM player is created and ready
    ensureBgmPlayer: function() {
        if (!this.bgmPlayer) {
            this.bgmPlayer = new Audio();
            this.bgmPlayer.loop = true;
            // Load volume from localStorage if available
            const storedVolume = localStorage.getItem('masterVolume');
            if (storedVolume !== null) {
                this.masterVolume = parseFloat(storedVolume);
            }
            this.bgmPlayer.volume = this.masterVolume; 
        }
    },

    // Play background music
    playMusic: function(src) {
        this.ensureBgmPlayer();
        if (this.bgmPlayer.src !== src) { // Only change if different BGM
            this.bgmPlayer.src = this.getAudioPath(src);
            this.bgmPlayer.load(); // Important to load new source
        }
        this.bgmPlayer.play().catch(error => console.error("Error playing BGM:", error));
        this.bgmPlayer.volume = this.masterVolume; // Apply current master volume
    },

    // Stop background music
    stopMusic: function() {
        if (this.bgmPlayer && !this.bgmPlayer.paused) {
            this.bgmPlayer.pause();
            this.bgmPlayer.currentTime = 0; // Reset for next play
        }
    },

    // Play a sound effect
    playSound: function(src, loop = false) {
        if (this.sfxPlayers.length >= this.maxSfxPlayers) {
            // Remove the oldest player if max is reached
            const oldestPlayer = this.sfxPlayers.shift();
            if (oldestPlayer && !oldestPlayer.paused) {
                oldestPlayer.pause();
                oldestPlayer.src = ''; // Release resource
            }
        }

        const sfxPlayer = new Audio(this.getAudioPath(src));
        sfxPlayer.loop = loop;
        sfxPlayer.volume = this.masterVolume;
        sfxPlayer.play().catch(error => console.error("Error playing SFX:", src, error));
        this.sfxPlayers.push(sfxPlayer);

        // Clean up finished SFX players
        sfxPlayer.onended = () => {
            this.sfxPlayers = this.sfxPlayers.filter(player => player !== sfxPlayer);
        };
    },

    // Set master volume for all audio
    setMasterVolume: function(volume) {
        this.masterVolume = Math.max(0, Math.min(1, parseFloat(volume))); // Clamp between 0 and 1
        if (this.bgmPlayer) {
            this.bgmPlayer.volume = this.masterVolume;
        }
        this.sfxPlayers.forEach(player => {
            player.volume = this.masterVolume;
        });
        // Save volume to localStorage
        localStorage.setItem('masterVolume', this.masterVolume.toString());
        console.log("Master volume set to:", this.masterVolume, "(persisted)");
    },

    // Helper to adjust path if running from scenes/html/
    getAudioPath: function(originalPath) {
        if (!originalPath) return null;
        const currentHtmlPath = window.location.pathname;
        // If the HTML file is inside /docs/scenes/html/
        if (currentHtmlPath.includes('/scenes/html/')) {
            // Assume originalPath is relative to /docs/ (e.g., "audio/bgm/theme.mp3")
            // So, we need to go up two levels from scenes/html/ to reach docs/
            return `../../${originalPath}`; 
        }
        // Otherwise, assume HTML is in /docs/ and path is relative to /docs/
        return originalPath;
    }
};

// Initialize BGM player on load and apply stored volume settings.
$(document).ready(function() {
    AudioManager.ensureBgmPlayer(); // This will now also load and apply stored volume
});