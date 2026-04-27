class GameData {
    constructor() {
        this.reset();
        this.onHealthChange = null;
        this.onGameOver = null;
    }
    
    reset() {
        this.health = GAME_CONFIG.INITIAL_HEALTH;
        this.roomsCompleted = 0;
        this.currentRoomType = null;
        this.invincibleTime = 0;
    }
    
    getHealth() {
        return this.health;
    }
    
    setHealth(value) {
        const oldHealth = this.health;
        this.health = Math.max(0, Math.min(GAME_CONFIG.INITIAL_HEALTH, value));
        
        if (this.onHealthChange && this.health !== oldHealth) {
            this.onHealthChange(this.health);
        }
        
        return this.health;
    }
    
    takeDamage() {
        if (this.invincibleTime > 0) return false;
        
        this.health--;
        this.invincibleTime = GAME_CONFIG.INVINCIBLE_DURATION;
        
        if (this.onHealthChange) {
            this.onHealthChange(this.health);
        }
        
        if (this.health <= 0 && this.onGameOver) {
            this.onGameOver();
        }
        
        return this.health <= 0;
    }
    
    updateInvincibleTime(deltaTime) {
        if (this.invincibleTime > 0) {
            this.invincibleTime -= deltaTime;
        }
    }
    
    isInvincible() {
        return this.invincibleTime > 0;
    }
    
    getRoomsCompleted() {
        return this.roomsCompleted;
    }
    
    incrementRoomsCompleted() {
        this.roomsCompleted++;
        return this.roomsCompleted;
    }
    
    isVictory() {
        return this.roomsCompleted >= GAME_CONFIG.ROOMS_TO_WIN;
    }
}

window.GameData = GameData;
