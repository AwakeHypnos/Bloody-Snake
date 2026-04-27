class BaseRoomPlugin {
    constructor(game) {
        this.game = game;
        this.roomType = null;
        this.flashTimer = 0;
        this.flashInterval = GAME_CONFIG.FLASH_INTERVAL;
    }
    
    getRoomType() {
        return this.roomType;
    }
    
    update(deltaTime) {
        if (this.game.data.isInvincible()) {
            this.flashTimer += deltaTime;
            if (this.flashTimer >= this.flashInterval) {
                this.flashTimer = 0;
            }
        }
    }
    
    render(ctx) {
    }
    
    shouldRenderPlayer() {
        return !this.game.data.isInvincible() || 
               Math.floor(this.flashTimer / (this.flashInterval / 2)) % 2 === 0;
    }
    
    roomComplete() {
        this.game.roomComplete();
    }
    
    spawnApple() {
        throw new Error('spawnApple() must be implemented by subclass');
    }
    
    spawnDoors() {
        throw new Error('spawnDoors() must be implemented by subclass');
    }
}

class RoomPluginManager {
    constructor() {
        this.plugins = new Map();
    }
    
    register(roomType, pluginClass) {
        this.plugins.set(roomType, pluginClass);
    }
    
    create(roomType, game) {
        const PluginClass = this.plugins.get(roomType);
        if (!PluginClass) {
            throw new Error(`No plugin registered for room type: ${roomType}`);
        }
        return new PluginClass(game);
    }
    
    getAvailableTypes() {
        return Array.from(this.plugins.keys());
    }
    
    getRandomType() {
        const types = this.getAvailableTypes();
        const randomIndex = Math.floor(Math.random() * types.length);
        return types[randomIndex];
    }
}

window.BaseRoomPlugin = BaseRoomPlugin;
window.RoomPluginManager = RoomPluginManager;
