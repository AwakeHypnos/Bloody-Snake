class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = GAME_CONFIG.CANVAS_WIDTH;
        this.canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
        
        this.state = GAME_STATES.MENU;
        this.keys = {};
        this.lastTime = 0;
        this.animationFrameId = null;
        
        this.data = new GameData();
        this.saveManager = new SaveManager();
        this.uiManager = new UIManager();
        this.pluginManager = new RoomPluginManager();
        
        this.currentRoom = null;
        this.currentRoomType = null;
        
        this.data.onHealthChange = (health) => {
            this.uiManager.updateHearts(health);
        };
        
        this.data.onGameOver = () => {
            this.gameOver();
        };
        
        this.setupEventListeners();
        this.initPlugins();
        this.uiManager.updateHearts(this.data.getHealth());
    }
    
    initPlugins() {
        this.pluginManager.register(ROOM_TYPES.SNAKE, SnakeRoom);
        this.pluginManager.register(ROOM_TYPES.SHOOTER, ShooterRoom);
        this.pluginManager.register(ROOM_TYPES.SPACESHIP, SpaceshipRoom);
        this.pluginManager.register(ROOM_TYPES.JUMP, JumpRoom);
        this.pluginManager.register(ROOM_TYPES.FALL, FallRoom);
        this.pluginManager.register(ROOM_TYPES.RUSSIAN_ROULETTE, RussianRouletteRoom);
        this.pluginManager.register(ROOM_TYPES.RACE, RaceRoom);
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
            if (e.key === 'Escape' || e.key === 'Esc') {
                this.togglePause();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('play-again-btn').addEventListener('click', () => this.startGame());
        document.getElementById('load-menu-btn').addEventListener('click', () => this.loadGame());
        
        document.getElementById('resume-btn').addEventListener('click', () => this.resumeGame());
        document.getElementById('save-btn').addEventListener('click', () => this.saveGame());
        document.getElementById('load-btn').addEventListener('click', () => this.loadGame());
        document.getElementById('quit-btn').addEventListener('click', () => this.quitToMenu());
    }
    
    startGame() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.data.reset();
        this.lastTime = 0;
        this.currentRoom = null;
        this.currentRoomType = null;
        
        this.uiManager.updateHearts(this.data.getHealth());
        this.uiManager.updateRoomInfo(this.data.getRoomsCompleted());
        
        this.uiManager.hideAllScreens();
        
        this.nextRoom();
        this.gameLoop();
    }
    
    nextRoom() {
        if (this.data.isVictory()) {
            this.victory();
            return;
        }
        
        this.showTransition();
        
        setTimeout(() => {
            const availableTypes = this.pluginManager.getAvailableTypes();
            let selectedType;
            
            if (this.currentRoomType && availableTypes.length > 1) {
                const filteredTypes = availableTypes.filter(type => type !== this.currentRoomType);
                const randomIndex = Math.floor(Math.random() * filteredTypes.length);
                selectedType = filteredTypes[randomIndex];
            } else {
                const randomIndex = Math.floor(Math.random() * availableTypes.length);
                selectedType = availableTypes[randomIndex];
            }
            
            this.currentRoomType = selectedType;
            
            this.hideTransition();
            
            this.currentRoom = this.pluginManager.create(this.currentRoomType, this);
            this.uiManager.updateRoomInfo(this.data.getRoomsCompleted(), this.currentRoomType);
            
            this.lastTime = performance.now();
            this.state = GAME_STATES.PLAYING;
        }, 1500);
    }
    
    showTransition() {
        this.state = GAME_STATES.TRANSITION;
        this.uiManager.showTransition();
    }
    
    hideTransition() {
        this.uiManager.hideTransition();
    }
    
    roomComplete() {
        this.data.incrementRoomsCompleted();
        this.uiManager.updateRoomInfo(this.data.getRoomsCompleted());
        
        if (this.data.isVictory()) {
            this.victory();
        } else {
            this.nextRoom();
        }
    }
    
    gameOver() {
        this.state = GAME_STATES.GAME_OVER;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.uiManager.setGameOverMessage(this.data.getRoomsCompleted());
        this.uiManager.showScreen('gameOver');
    }
    
    victory() {
        this.state = GAME_STATES.VICTORY;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.uiManager.showScreen('victory');
    }
    
    pauseGame() {
        if (this.state === GAME_STATES.PLAYING) {
            this.state = GAME_STATES.PAUSED;
            this.uiManager.showScreen('pause');
        }
    }
    
    resumeGame() {
        if (this.state === GAME_STATES.PAUSED) {
            this.state = GAME_STATES.PLAYING;
            this.uiManager.hideScreen('pause');
            this.lastTime = performance.now();
        }
    }
    
    togglePause() {
        if (this.state === GAME_STATES.PLAYING) {
            this.pauseGame();
        } else if (this.state === GAME_STATES.PAUSED) {
            this.resumeGame();
        }
    }
    
    saveGame() {
        this.saveManager.save({
            health: this.data.getHealth(),
            roomsCompleted: this.data.getRoomsCompleted()
        });
        this.uiManager.showSaveMessage('游戏已保存！');
    }
    
    loadGame() {
        const saveData = this.saveManager.load();
        if (!saveData) {
            this.uiManager.showSaveMessage('没有找到存档！');
            return;
        }
        
        try {
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            
            this.data.reset();
            this.data.setHealth(saveData.health);
            this.data.roomsCompleted = saveData.roomsCompleted;
            this.lastTime = 0;
            this.currentRoom = null;
            this.currentRoomType = null;
            
            this.uiManager.updateHearts(this.data.getHealth());
            this.uiManager.updateRoomInfo(this.data.getRoomsCompleted());
            
            this.uiManager.hideAllScreens();
            
            this.nextRoom();
            this.gameLoop();
            
            this.uiManager.showSaveMessage('游戏已读取！');
        } catch (e) {
            this.uiManager.showSaveMessage('存档读取失败！');
            console.error(e);
        }
    }
    
    hasSaveData() {
        return this.saveManager.hasSaveData();
    }
    
    quitToMenu() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.state = GAME_STATES.MENU;
        this.currentRoom = null;
        
        this.uiManager.hideAllScreens();
        this.uiManager.showScreen('start');
    }
    
    gameLoop(currentTime = 0) {
        this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
        
        if (this.state !== GAME_STATES.PLAYING) {
            return;
        }
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.data.updateInvincibleTime(deltaTime);
        
        this.ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        if (this.currentRoom) {
            this.currentRoom.update(deltaTime);
            this.currentRoom.render(this.ctx);
        }
    }
}

window.Game = Game;
