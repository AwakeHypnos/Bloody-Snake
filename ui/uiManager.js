class UIManager {
    constructor() {
        this.screens = {
            start: document.getElementById('start-screen'),
            pause: document.getElementById('pause-screen'),
            gameOver: document.getElementById('game-over-screen'),
            victory: document.getElementById('victory-screen'),
            transition: document.getElementById('transition-screen')
        };
        
        this.elements = {
            hearts: document.getElementById('hearts'),
            roomCount: document.getElementById('room-count'),
            roomType: document.getElementById('room-type'),
            transitionText: document.getElementById('transition-text'),
            gameOverMessage: document.getElementById('game-over-message'),
            saveMessage: document.getElementById('save-message')
        };
    }
    
    showScreen(screenName) {
        this.hideAllScreens();
        if (this.screens[screenName]) {
            this.screens[screenName].classList.remove('hidden');
        }
    }
    
    hideScreen(screenName) {
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('hidden');
        }
    }
    
    hideAllScreens() {
        Object.values(this.screens).forEach(screen => {
            if (screen) {
                screen.classList.add('hidden');
            }
        });
    }
    
    updateHearts(health) {
        const heartsDiv = this.elements.hearts;
        if (!heartsDiv) return;
        
        heartsDiv.innerHTML = '';
        
        for (let i = 0; i < GAME_CONFIG.INITIAL_HEALTH; i++) {
            const heart = document.createElement('span');
            heart.className = 'heart' + (i >= health ? ' empty' : '');
            heart.textContent = '❤️';
            heartsDiv.appendChild(heart);
        }
    }
    
    updateRoomInfo(roomsCompleted, roomType = null) {
        if (this.elements.roomCount) {
            this.elements.roomCount.textContent = `房间: ${roomsCompleted}/${GAME_CONFIG.ROOMS_TO_WIN}`;
        }
        
        if (this.elements.roomType && roomType) {
            this.elements.roomType.textContent = ROOM_DISPLAY_NAMES[roomType] || '';
        }
    }
    
    showTransition() {
        const randomText = TRANSITION_TEXTS[Math.floor(Math.random() * TRANSITION_TEXTS.length)];
        if (this.elements.transitionText) {
            this.elements.transitionText.textContent = randomText;
        }
        this.showScreen('transition');
    }
    
    hideTransition() {
        this.hideScreen('transition');
    }
    
    setGameOverMessage(roomsCompleted) {
        if (this.elements.gameOverMessage) {
            this.elements.gameOverMessage.textContent = `你在第 ${roomsCompleted + 1} 个房间阵亡了！`;
        }
    }
    
    showSaveMessage(message) {
        const msgEl = this.elements.saveMessage;
        if (!msgEl) return;
        
        msgEl.textContent = message;
        msgEl.classList.remove('hidden');
        setTimeout(() => {
            msgEl.classList.add('hidden');
        }, 2000);
    }
}

window.UIManager = UIManager;
