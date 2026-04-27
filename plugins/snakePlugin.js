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
        
        this.snake = [
            { x: 5, y: Math.floor(this.gridHeight / 2) },
            { x: 4, y: Math.floor(this.gridHeight / 2) },
            { x: 3, y: Math.floor(this.gridHeight / 2) }
        ];
        
        this.applesEaten = 0;
        this.applesNeeded = 13;
        this.roomApple = null;
        this.roomAppleSpawned = false;
        
        this.apple = this.spawnApple();
        
        this.doors = [];
        this.doorsOpen = false;
        this.doorsSpawned = false;
    }
    
    spawnApple() {
        let apple;
        do {
            apple = {
                x: Math.floor(Math.random() * this.gridWidth),
                y: Math.floor(Math.random() * this.gridHeight)
            };
        } while (this.isSnakeAt(apple.x, apple.y));
        return apple;
    }
    
    isSnakeAt(x, y) {
        return this.snake.some(segment => segment.x === x && segment.y === y);
    }
    
    spawnRoomApple() {
        let apple;
        do {
            apple = {
                x: Math.floor(Math.random() * this.gridWidth),
                y: Math.floor(Math.random() * this.gridHeight)
            };
        } while (this.isSnakeAt(apple.x, apple.y) || (this.apple && this.apple.x === apple.x && this.apple.y === apple.y));
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
    
    update(deltaTime) {
        super.update(deltaTime);
        this.handleInput();
        
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
            this.moveInterval = this.boostedMoveInterval;
        } else if (!pressingSameDirection && this.isBoosted) {
            this.isBoosted = false;
            this.moveInterval = this.normalMoveInterval;
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
        
        if (this.roomAppleSpawned && !this.doorsOpen) {
            ctx.fillStyle = '#ffd700';
            ctx.fillText('收集金苹果离开房间！', GAME_CONFIG.CANVAS_WIDTH / 2 - 80, 55);
        }
    }
}

window.SnakeRoom = SnakeRoom;
