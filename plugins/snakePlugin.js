const SNAKE_POWERUP_TYPES = {
    HEART: 'heart',
    COFFEE: 'coffee',
    MINE: 'mine',
    RED_POTION: 'red_potion',
    BLUE_POTION: 'blue_potion'
};

const SNAKE_POWERUP_NAMES = {
    [SNAKE_POWERUP_TYPES.HEART]: '心',
    [SNAKE_POWERUP_TYPES.COFFEE]: '咖啡',
    [SNAKE_POWERUP_TYPES.MINE]: '地雷',
    [SNAKE_POWERUP_TYPES.RED_POTION]: '红药水',
    [SNAKE_POWERUP_TYPES.BLUE_POTION]: '蓝药水'
};

class SnakeRoom extends BaseRoomPlugin {
    constructor(game) {
        super(game);
        this.roomType = ROOM_TYPES.SNAKE;
        
        this.gridSize = GAME_CONFIG.TILE_SIZE;
        this.gridWidth = Math.floor(GAME_CONFIG.CANVAS_WIDTH / this.gridSize);
        this.gridHeight = Math.floor(GAME_CONFIG.CANVAS_HEIGHT / this.gridSize);
        
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.moveTimer = 0;
        this.normalMoveInterval = 200;
        this.boostedMoveInterval = 80;
        this.moveInterval = this.normalMoveInterval;
        this.isBoosted = false;
        
        this.coffeeSpeedUp = false;
        this.coffeeTimer = 0;
        this.coffeeDuration = 5000;
        this.coffeeMoveInterval = 100;
        
        this.snake = [
            { x: 5, y: Math.floor(this.gridHeight / 2) },
            { x: 4, y: Math.floor(this.gridHeight / 2) },
            { x: 3, y: Math.floor(this.gridHeight / 2) }
        ];
        
        this.applesEaten = 0;
        this.applesNeeded = 13;
        this.roomApple = null;
        this.roomAppleSpawned = false;
        
        this.powerups = [];
        this.powerupSpawnTimer = 0;
        this.powerupSpawnInterval = 5000;
        this.mines = [];
        
        this.apple = this.spawnApple();
        
        this.doors = [];
        this.doorsOpen = false;
        this.doorsSpawned = false;
        
        this.effectMessage = '';
        this.effectMessageTimer = 0;
    }
    
    spawnApple() {
        let apple;
        do {
            apple = {
                x: Math.floor(Math.random() * this.gridWidth),
                y: Math.floor(Math.random() * this.gridHeight)
            };
        } while (this.isSnakeAt(apple.x, apple.y) || this.isPowerupAt(apple.x, apple.y) || this.isMineAt(apple.x, apple.y));
        return apple;
    }
    
    isSnakeAt(x, y) {
        return this.snake.some(segment => segment.x === x && segment.y === y);
    }
    
    isPowerupAt(x, y) {
        return this.powerups.some(p => p.x === x && p.y === y);
    }
    
    isMineAt(x, y) {
        return this.mines.some(m => {
            return x >= m.x && x < m.x + 2 && y >= m.y && y < m.y + 2;
        });
    }
    
    spawnPowerup() {
        const types = Object.values(SNAKE_POWERUP_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];
        
        let powerup;
        let attempts = 0;
        const maxAttempts = 50;
        
        do {
            powerup = {
                x: Math.floor(Math.random() * this.gridWidth),
                y: Math.floor(Math.random() * this.gridHeight),
                type: type,
                glow: 0
            };
            attempts++;
        } while (
            (this.isSnakeAt(powerup.x, powerup.y) || 
             this.isPowerupAt(powerup.x, powerup.y) ||
             this.isMineAt(powerup.x, powerup.y) ||
             (this.apple && this.apple.x === powerup.x && this.apple.y === powerup.y) ||
             (this.roomApple && this.roomApple.x === powerup.x && this.roomApple.y === powerup.y)) &&
            attempts < maxAttempts
        );
        
        if (type === SNAKE_POWERUP_TYPES.MINE) {
            powerup.x = Math.min(powerup.x, this.gridWidth - 2);
            powerup.y = Math.min(powerup.y, this.gridHeight - 2);
            this.mines.push({
                x: powerup.x,
                y: powerup.y,
                armed: true
            });
        } else {
            this.powerups.push(powerup);
        }
    }
    
    spawnRoomApple() {
        let apple;
        do {
            apple = {
                x: Math.floor(Math.random() * this.gridWidth),
                y: Math.floor(Math.random() * this.gridHeight)
            };
        } while (
            this.isSnakeAt(apple.x, apple.y) || 
            (this.apple && this.apple.x === apple.x && this.apple.y === apple.y) ||
            this.isPowerupAt(apple.x, apple.y) ||
            this.isMineAt(apple.x, apple.y)
        );
        return apple;
    }
    
    spawnDoors() {
        const doorCount = Math.floor(Math.random() * 3) + 1;
        this.doors = [];
        
        const positions = [
            { x: 0, y: Math.floor(this.gridHeight / 2), side: 'left' },
            { x: this.gridWidth - 1, y: Math.floor(this.gridHeight / 2), side: 'right' },
            { x: Math.floor(this.gridWidth / 2), y: 0, side: 'top' },
            { x: Math.floor(this.gridWidth / 2), y: this.gridHeight - 1, side: 'bottom' }
        ];
        
        const shuffled = MathUtils.shuffleArray(positions);
        for (let i = 0; i < doorCount; i++) {
            this.doors.push(shuffled[i]);
        }
    }
    
    showEffectMessage(msg) {
        this.effectMessage = msg;
        this.effectMessageTimer = 2000;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        this.handleInput();
        
        if (this.effectMessageTimer > 0) {
            this.effectMessageTimer -= deltaTime;
        }
        
        if (this.coffeeTimer > 0) {
            this.coffeeTimer -= deltaTime;
            if (this.coffeeTimer <= 0) {
                this.coffeeSpeedUp = false;
                if (!this.isBoosted) {
                    this.moveInterval = this.normalMoveInterval;
                }
                this.showEffectMessage('咖啡效果结束');
            }
        }
        
        if (!this.roomAppleSpawned) {
            this.powerupSpawnTimer += deltaTime;
            if (this.powerupSpawnTimer >= this.powerupSpawnInterval) {
                this.powerupSpawnTimer = 0;
                if (this.powerups.length + this.mines.length < 3) {
                    this.spawnPowerup();
                }
            }
        }
        
        this.powerups.forEach(p => {
            p.glow = (p.glow + deltaTime / 200) % (Math.PI * 2);
        });
        
        this.moveTimer += deltaTime;
        if (this.moveTimer >= this.moveInterval) {
            this.moveTimer = 0;
            this.move();
        }
    }
    
    handleInput() {
        const pressingSameDirection = 
            (this.game.keys['ArrowUp'] && this.direction.y === -1) ||
            (this.game.keys['ArrowDown'] && this.direction.y === 1) ||
            (this.game.keys['ArrowLeft'] && this.direction.x === -1) ||
            (this.game.keys['ArrowRight'] && this.direction.x === 1);
        
        if (pressingSameDirection && !this.isBoosted) {
            this.isBoosted = true;
            if (!this.coffeeSpeedUp) {
                this.moveInterval = this.boostedMoveInterval;
            }
        } else if (!pressingSameDirection && this.isBoosted) {
            this.isBoosted = false;
            if (!this.coffeeSpeedUp) {
                this.moveInterval = this.normalMoveInterval;
            }
        }
        
        if (this.game.keys['ArrowUp'] && this.direction.y !== 1) {
            this.nextDirection = { x: 0, y: -1 };
        } else if (this.game.keys['ArrowDown'] && this.direction.y !== -1) {
            this.nextDirection = { x: 0, y: 1 };
        } else if (this.game.keys['ArrowLeft'] && this.direction.x !== 1) {
            this.nextDirection = { x: -1, y: 0 };
        } else if (this.game.keys['ArrowRight'] && this.direction.x !== -1) {
            this.nextDirection = { x: 1, y: 0 };
        }
    }
    
    move() {
        this.direction = { ...this.nextDirection };
        
        const head = { ...this.snake[0] };
        head.x += this.direction.x;
        head.y += this.direction.y;
        
        if (head.x < 0) head.x = this.gridWidth - 1;
        if (head.x >= this.gridWidth) head.x = 0;
        if (head.y < 0) head.y = this.gridHeight - 1;
        if (head.y >= this.gridHeight) head.y = 0;
        
        for (let i = 0; i < this.snake.length - 1; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                this.game.data.takeDamage();
                return;
            }
        }
        
        for (const mine of this.mines) {
            if (mine.armed && 
                head.x >= mine.x && head.x < mine.x + 2 && 
                head.y >= mine.y && head.y < mine.y + 2) {
                mine.armed = false;
                this.game.data.takeDamage();
                this.showEffectMessage('💥 踩到地雷！');
                this.mines = this.mines.filter(m => m !== mine);
                return;
            }
        }
        
        const powerupIndex = this.powerups.findIndex(p => p.x === head.x && p.y === head.y);
        if (powerupIndex !== -1) {
            this.applyPowerup(this.powerups[powerupIndex]);
            this.powerups.splice(powerupIndex, 1);
        }
        
        if (this.doorsOpen) {
            for (const door of this.doors) {
                if (head.x === door.x && head.y === door.y) {
                    this.roomComplete();
                    return;
                }
            }
        }
        
        if (this.roomApple && head.x === this.roomApple.x && head.y === this.roomApple.y) {
            this.roomApple = null;
            this.doorsOpen = true;
            if (!this.doorsSpawned) {
                this.spawnDoors();
                this.doorsSpawned = true;
            }
        }
        
        this.snake.unshift(head);
        
        if (this.apple && head.x === this.apple.x && head.y === this.apple.y) {
            this.applesEaten++;
            if (this.applesEaten >= this.applesNeeded) {
                this.apple = null;
                this.roomApple = this.spawnRoomApple();
                this.roomAppleSpawned = true;
            } else {
                this.apple = this.spawnApple();
            }
        } else {
            this.snake.pop();
        }
    }
    
    applyPowerup(powerup) {
        switch(powerup.type) {
            case SNAKE_POWERUP_TYPES.HEART:
                const currentHealth = this.game.data.getHealth();
                if (currentHealth < GAME_CONFIG.INITIAL_HEALTH) {
                    this.game.data.setHealth(currentHealth + 1);
                    this.showEffectMessage('❤️ 回复一颗心！');
                } else {
                    this.showEffectMessage('❤️ 生命已满！');
                }
                break;
                
            case SNAKE_POWERUP_TYPES.COFFEE:
                this.coffeeSpeedUp = true;
                this.coffeeTimer = this.coffeeDuration;
                this.moveInterval = this.coffeeMoveInterval;
                this.isBoosted = false;
                this.showEffectMessage('☕ 咖啡加速！');
                break;
                
            case SNAKE_POWERUP_TYPES.RED_POTION:
                for (let i = 0; i < 2; i++) {
                    const tail = { ...this.snake[this.snake.length - 1] };
                    this.snake.push(tail);
                }
                this.showEffectMessage('🧪 红药水：增长2格！');
                break;
                
            case SNAKE_POWERUP_TYPES.BLUE_POTION:
                if (this.snake.length > 1) {
                    if (this.snake.length <= 3) {
                        this.game.data.takeDamage();
                        this.showEffectMessage('🧪 蓝药水：太短了，掉一颗心！');
                    } else {
                        for (let i = 0; i < 2 && this.snake.length > 1; i++) {
                            this.snake.pop();
                        }
                        this.showEffectMessage('🧪 蓝药水：缩短2格！');
                    }
                } else {
                    this.game.data.takeDamage();
                    this.showEffectMessage('🧪 蓝药水：太短了，掉一颗心！');
                }
                break;
        }
    }
    
    render(ctx) {
        ctx.fillStyle = '#0d1b2a';
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        ctx.strokeStyle = '#1b263b';
        ctx.lineWidth = 1;
        for (let x = 0; x <= GAME_CONFIG.CANVAS_WIDTH; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, GAME_CONFIG.CANVAS_HEIGHT);
            ctx.stroke();
        }
        for (let y = 0; y <= GAME_CONFIG.CANVAS_HEIGHT; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH, y);
            ctx.stroke();
        }
        
        this.mines.forEach(mine => {
            this.renderMine(ctx, mine);
        });
        
        this.powerups.forEach(powerup => {
            this.renderPowerup(ctx, powerup);
        });
        
        if (this.apple) {
            this.renderAppleSegment(ctx, this.apple, '#e63946');
        }
        
        if (this.roomApple) {
            this.renderAppleSegment(ctx, this.roomApple, '#ffd700');
        }
        
        if (this.shouldRenderPlayer()) {
            this.snake.forEach((segment, index) => {
                const color = index === 0 ? '#06d6a0' : '#118ab2';
                this.renderSnakeSegment(ctx, segment, color, index === 0);
            });
        }
        
        if (this.doorsOpen) {
            this.doors.forEach(door => {
                this.renderDoor(ctx, door);
            });
        }
        
        this.renderHUD(ctx);
    }
    
    renderPowerup(ctx, powerup) {
        const x = powerup.x * this.gridSize;
        const y = powerup.y * this.gridSize;
        const glowRadius = Math.sin(powerup.glow) * 5 + 5;
        
        let mainColor, emoji;
        switch(powerup.type) {
            case SNAKE_POWERUP_TYPES.HEART:
                mainColor = '#ff6b6b';
                emoji = '❤️';
                break;
            case SNAKE_POWERUP_TYPES.COFFEE:
                mainColor = '#8B4513';
                emoji = '☕';
                break;
            case SNAKE_POWERUP_TYPES.RED_POTION:
                mainColor = '#e63946';
                emoji = '🧪';
                break;
            case SNAKE_POWERUP_TYPES.BLUE_POTION:
                mainColor = '#4cc9f0';
                emoji = '🧪';
                break;
            default:
                mainColor = '#fff';
                emoji = '?';
        }
        
        ctx.beginPath();
        ctx.arc(x + this.gridSize / 2, y + this.gridSize / 2, this.gridSize / 2 + glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${mainColor}40`;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x + this.gridSize / 2, y + this.gridSize / 2, this.gridSize / 2 - 2, 0, Math.PI * 2);
        ctx.fillStyle = mainColor;
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, x + this.gridSize / 2, y + this.gridSize / 2);
    }
    
    renderMine(ctx, mine) {
        const x = mine.x * this.gridSize;
        const y = mine.y * this.gridSize;
        const size = this.gridSize * 2;
        
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
        
        ctx.strokeStyle = mine.armed ? '#ff6b6b' : '#666';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
        
        if (mine.armed) {
            const flash = Math.sin(Date.now() / 200) > 0;
            ctx.fillStyle = flash ? '#ff0000' : '#660000';
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💣', x + size / 2, y + size / 2);
    }
    
    renderAppleSegment(ctx, apple, color) {
        const x = apple.x * this.gridSize;
        const y = apple.y * this.gridSize;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + this.gridSize / 2, y + this.gridSize / 2, this.gridSize / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#4cc9f0';
        ctx.beginPath();
        ctx.arc(x + this.gridSize / 2 - 3, y + this.gridSize / 2 - 3, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderSnakeSegment(ctx, segment, color, isHead) {
        const x = segment.x * this.gridSize;
        const y = segment.y * this.gridSize;
        const padding = 1;
        
        ctx.fillStyle = color;
        ctx.fillRect(x + padding, y + padding, this.gridSize - padding * 2, this.gridSize - padding * 2);
        
        if (isHead) {
            ctx.fillStyle = '#fff';
            const eyeSize = 4;
            const eyeOffset = 5;
            
            if (this.direction.x === 1) {
                ctx.fillRect(x + this.gridSize - eyeOffset - eyeSize, y + 4, eyeSize, eyeSize);
                ctx.fillRect(x + this.gridSize - eyeOffset - eyeSize, y + this.gridSize - 8, eyeSize, eyeSize);
            } else if (this.direction.x === -1) {
                ctx.fillRect(x + eyeOffset, y + 4, eyeSize, eyeSize);
                ctx.fillRect(x + eyeOffset, y + this.gridSize - 8, eyeSize, eyeSize);
            } else if (this.direction.y === 1) {
                ctx.fillRect(x + 4, y + this.gridSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                ctx.fillRect(x + this.gridSize - 8, y + this.gridSize - eyeOffset - eyeSize, eyeSize, eyeSize);
            } else {
                ctx.fillRect(x + 4, y + eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(x + this.gridSize - 8, y + eyeOffset, eyeSize, eyeSize);
            }
        }
    }
    
    renderDoor(ctx, door) {
        const x = door.x * this.gridSize;
        const y = door.y * this.gridSize;
        
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x, y, this.gridSize, this.gridSize);
        
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(x + this.gridSize / 2, y + this.gridSize / 2, this.gridSize / 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderHUD(ctx) {
        ctx.fillStyle = '#fff';
        ctx.font = '16px Courier New';
        ctx.fillText(`小苹果: ${this.applesEaten}/${this.applesNeeded}`, GAME_CONFIG.CANVAS_WIDTH / 2 - 60, 30);
        
        const statusItems = [];
        if (this.coffeeSpeedUp) {
            const seconds = Math.ceil(this.coffeeTimer / 1000);
            statusItems.push(`☕${seconds}s`);
        }
        if (statusItems.length > 0) {
            ctx.fillStyle = '#ffd700';
            ctx.fillText(statusItems.join(' '), 20, 30);
        }
        
        if (this.effectMessageTimer > 0 && this.effectMessage) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, this.effectMessageTimer / 500);
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 20px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(this.effectMessage, GAME_CONFIG.CANVAS_WIDTH / 2, 80);
            ctx.restore();
        }
        
        if (this.roomAppleSpawned && !this.doorsOpen) {
            ctx.fillStyle = '#ffd700';
            ctx.fillText('收集金苹果离开房间！', GAME_CONFIG.CANVAS_WIDTH / 2 - 80, 55);
        }
    }
}

window.SnakeRoom = SnakeRoom;
