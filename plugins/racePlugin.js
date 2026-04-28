const RACE_TRACK_COUNT = 3;
const RACE_TRACK_WIDTH = 200;
const RACE_SEGMENT_SIZE = 50;
const RACE_OBSTACLE_SIZE = 40;
const RACE_POWERUP_SIZE = 35;

const RACE_OBSTACLE_TYPES = {
    WALL: 'wall',
    SPIKE: 'spike',
    BARREL: 'barrel'
};

const RACE_POWERUP_TYPES = {
    HEART: 'heart',
    SHIELD: 'shield',
    SPEED: 'speed',
    SLOW: 'slow'
};

class RaceRoom extends BaseRoomPlugin {
    constructor(game) {
        super(game);
        this.roomType = ROOM_TYPES.RACE;
        
        this.trackWidth = RACE_TRACK_WIDTH;
        this.segmentSize = RACE_SEGMENT_SIZE;
        
        this.snakeTrack = 1;
        this.snakeY = GAME_CONFIG.CANVAS_HEIGHT - 100;
        this.snakeLength = 5;
        this.snakeSegments = [];
        this.snakeSpeed = 3;
        this.baseSnakeSpeed = 3;
        
        this.shield = false;
        this.speedBoostTimer = 0;
        this.slowTimer = 0;
        
        this.obstacles = [];
        this.powerups = [];
        
        this.spawnTimer = 0;
        this.spawnInterval = 800;
        
        this.progress = 0;
        this.targetProgress = 400;
        this.isFinished = false;
        
        this.finishLineY = -100;
        this.isPastFinishLine = false;
        
        this.freeMoveMode = false;
        this.snakeX = GAME_CONFIG.CANVAS_WIDTH / 2;
        this.snakeFreeSegments = [];
        this.snakeDirection = { x: 0, y: -1 };
        this.snakeNextDirection = { x: 0, y: -1 };
        this.freeMoveTimer = 0;
        this.freeMoveInterval = 150;
        
        this.goldenApple = null;
        this.goldenAppleCollected = false;
        
        this.doors = [];
        this.doorsOpen = false;
        this.selectedDoor = 1;
        this.doorAnimation = 0;
        
        this.cameraY = 0;
        this.trackOffset = 0;
        
        this.initializeSnake();
        this.spawnInitialObstacles();
    }
    
    initializeSnake() {
        this.snakeSegments = [];
        for (let i = 0; i < this.snakeLength; i++) {
            this.snakeSegments.push({
                track: 1,
                y: this.snakeY + i * RACE_SEGMENT_SIZE
            });
        }
    }
    
    spawnInitialObstacles() {
        for (let i = 0; i < 5; i++) {
            this.spawnObstacleOrPowerup(GAME_CONFIG.CANVAS_HEIGHT - 300 - i * 150);
        }
    }
    
    getTrackX(track) {
        const centerX = GAME_CONFIG.CANVAS_WIDTH / 2;
        const trackSpacing = this.trackWidth;
        return centerX + (track - 1) * trackSpacing;
    }
    
    spawnObstacleOrPowerup(y) {
        const track = Math.floor(Math.random() * RACE_TRACK_COUNT);
        
        if (Math.random() < 0.3) {
            const types = Object.values(RACE_POWERUP_TYPES);
            const type = types[Math.floor(Math.random() * types.length)];
            
            this.powerups.push({
                track: track,
                y: y,
                type: type,
                glow: 0,
                collected: false
            });
        } else {
            const types = Object.values(RACE_OBSTACLE_TYPES);
            const type = types[Math.floor(Math.random() * types.length)];
            
            this.obstacles.push({
                track: track,
                y: y,
                type: type,
                width: RACE_OBSTACLE_SIZE,
                height: RACE_OBSTACLE_SIZE
            });
        }
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        if (this.freeMoveMode) {
            this.handleFreeMoveInput();
            this.freeMoveTimer += deltaTime;
            
            if (this.freeMoveTimer >= this.freeMoveInterval) {
                this.freeMoveTimer = 0;
                this.freeMoveSnake();
            }
            
            if (this.goldenApple && !this.goldenAppleCollected) {
                this.goldenApple.glow = (this.goldenApple.glow + deltaTime / 200) % (Math.PI * 2);
            }
            
            if (this.doorsOpen) {
                this.handleDoorInput();
                this.doorAnimation += deltaTime / 500;
            }
            return;
        }
        
        if (this.isFinished) {
            this.handleDoorInput();
            this.doorAnimation += deltaTime / 500;
            return;
        }
        
        this.handleInput();
        
        if (this.speedBoostTimer > 0) {
            this.speedBoostTimer -= deltaTime;
            this.snakeSpeed = this.baseSnakeSpeed * 1.5;
            if (this.speedBoostTimer <= 0) {
                this.snakeSpeed = this.baseSnakeSpeed;
            }
        }
        
        if (this.slowTimer > 0) {
            this.slowTimer -= deltaTime;
            this.snakeSpeed = this.baseSnakeSpeed * 0.5;
            if (this.slowTimer <= 0) {
                this.snakeSpeed = this.baseSnakeSpeed;
            }
        }
        
        const moveAmount = this.snakeSpeed * deltaTime / 16;
        
        const totalDistance = (this.targetProgress / 100) * (GAME_CONFIG.CANVAS_HEIGHT * 2);
        const currentDistance = (this.progress / 100) * (GAME_CONFIG.CANVAS_HEIGHT * 2);
        this.finishLineY = GAME_CONFIG.CANVAS_HEIGHT - 80 - (totalDistance - currentDistance);
        
        this.trackOffset += moveAmount;
        this.progress += moveAmount / (GAME_CONFIG.CANVAS_HEIGHT * 2) * 100;
        
        if (this.progress >= this.targetProgress && !this.isPastFinishLine) {
            this.isPastFinishLine = true;
            this.isFinished = true;
            this.enterFreeMoveMode();
            return;
        }
        
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnObstacleOrPowerup(-50);
        }
        
        this.obstacles.forEach(obs => {
            obs.y += moveAmount;
        });
        
        this.powerups.forEach(p => {
            p.y += moveAmount;
            p.glow = (p.glow + deltaTime / 200) % (Math.PI * 2);
        });
        
        this.snakeY -= moveAmount;
        this.snakeSegments.forEach((seg, i) => {
            if (i === 0) {
                seg.track = this.snakeTrack;
            } else {
                seg.track = this.snakeSegments[i - 1].track;
            }
        });
        
        this.checkCollisions();
        
        this.obstacles = this.obstacles.filter(obs => obs.y < GAME_CONFIG.CANVAS_HEIGHT + 100);
        this.powerups = this.powerups.filter(p => p.y < GAME_CONFIG.CANVAS_HEIGHT + 100 && !p.collected);
    }
    
    enterFreeMoveMode() {
        this.freeMoveMode = true;
        
        const headX = this.getTrackX(this.snakeTrack);
        this.snakeX = headX;
        
        this.snakeFreeSegments = [];
        for (let i = 0; i < this.snakeLength; i++) {
            this.snakeFreeSegments.push({
                x: headX,
                y: GAME_CONFIG.CANVAS_HEIGHT - 80 + i * 30
            });
        }
        
        this.spawnGoldenApple();
    }
    
    spawnGoldenApple() {
        let apple;
        const minDistance = 100;
        
        do {
            apple = {
                x: Math.random() * (GAME_CONFIG.CANVAS_WIDTH - 100) + 50,
                y: Math.random() * (GAME_CONFIG.CANVAS_HEIGHT - 200) + 100,
                glow: 0,
                radius: 20
            };
        } while (Math.abs(apple.x - this.snakeX) < minDistance);
        
        this.goldenApple = apple;
    }
    
    handleFreeMoveInput() {
        if (this.game.keys['ArrowUp'] || this.game.keys['w']) {
            if (this.snakeDirection.y !== 1) {
                this.snakeNextDirection = { x: 0, y: -1 };
            }
        }
        if (this.game.keys['ArrowDown'] || this.game.keys['s']) {
            if (this.snakeDirection.y !== -1) {
                this.snakeNextDirection = { x: 0, y: 1 };
            }
        }
        if (this.game.keys['ArrowLeft'] || this.game.keys['a']) {
            if (this.snakeDirection.x !== 1) {
                this.snakeNextDirection = { x: -1, y: 0 };
            }
        }
        if (this.game.keys['ArrowRight'] || this.game.keys['d']) {
            if (this.snakeDirection.x !== -1) {
                this.snakeNextDirection = { x: 1, y: 0 };
            }
        }
    }
    
    freeMoveSnake() {
        this.snakeDirection = { ...this.snakeNextDirection };
        
        const moveStep = 30;
        const newHead = {
            x: this.snakeFreeSegments[0].x + this.snakeDirection.x * moveStep,
            y: this.snakeFreeSegments[0].y + this.snakeDirection.y * moveStep
        };
        
        newHead.x = Math.max(30, Math.min(GAME_CONFIG.CANVAS_WIDTH - 30, newHead.x));
        newHead.y = Math.max(30, Math.min(GAME_CONFIG.CANVAS_HEIGHT - 30, newHead.y));
        
        for (let i = 1; i < this.snakeFreeSegments.length - 1; i++) {
            if (newHead.x === this.snakeFreeSegments[i].x && 
                newHead.y === this.snakeFreeSegments[i].y) {
                return;
            }
        }
        
        this.snakeFreeSegments.unshift(newHead);
        this.snakeFreeSegments.pop();
        
        if (this.goldenApple && !this.goldenAppleCollected) {
            const headX = this.snakeFreeSegments[0].x;
            const headY = this.snakeFreeSegments[0].y;
            const dx = headX - this.goldenApple.x;
            const dy = headY - this.goldenApple.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.goldenApple.radius + 20) {
                this.collectGoldenApple();
            }
        }
    }
    
    collectGoldenApple() {
        this.goldenAppleCollected = true;
        this.goldenApple = null;
        this.doorsOpen = true;
        this.spawnDoors();
    }
    
    handleInput() {
        if (this.game.keys['ArrowLeft'] || this.game.keys['a']) {
            if (this.snakeTrack > 0) {
                this.snakeTrack--;
                this.game.keys['ArrowLeft'] = false;
                this.game.keys['a'] = false;
            }
        }
        
        if (this.game.keys['ArrowRight'] || this.game.keys['d']) {
            if (this.snakeTrack < RACE_TRACK_COUNT - 1) {
                this.snakeTrack++;
                this.game.keys['ArrowRight'] = false;
                this.game.keys['d'] = false;
            }
        }
    }
    
    handleDoorInput() {
        if (this.game.keys['ArrowLeft'] || this.game.keys['a']) {
            if (this.selectedDoor > 0) {
                this.selectedDoor--;
                this.game.keys['ArrowLeft'] = false;
                this.game.keys['a'] = false;
            }
        }
        
        if (this.game.keys['ArrowRight'] || this.game.keys['d']) {
            if (this.selectedDoor < 2) {
                this.selectedDoor++;
                this.game.keys['ArrowRight'] = false;
                this.game.keys['d'] = false;
            }
        }
        
        if (this.game.keys[' '] || this.game.keys['Enter']) {
            this.game.keys[' '] = false;
            this.game.keys['Enter'] = false;
            this.roomComplete();
        }
    }
    
    checkCollisions() {
        const headTrack = this.snakeTrack;
        const headY = GAME_CONFIG.CANVAS_HEIGHT - 80;
        
        for (const obs of this.obstacles) {
            if (obs.track === headTrack) {
                const obsCenterY = obs.y + obs.height / 2;
                const distance = Math.abs(headY - obsCenterY);
                
                if (distance < (RACE_OBSTACLE_SIZE / 2 + 20)) {
                    if (this.shield) {
                        this.shield = false;
                        this.obstacles = this.obstacles.filter(o => o !== obs);
                    } else {
                        this.game.data.takeDamage();
                        this.obstacles = this.obstacles.filter(o => o !== obs);
                    }
                    break;
                }
            }
        }
        
        for (const powerup of this.powerups) {
            if (!powerup.collected && powerup.track === headTrack) {
                const powerupCenterY = powerup.y + RACE_POWERUP_SIZE / 2;
                const distance = Math.abs(headY - powerupCenterY);
                
                if (distance < (RACE_POWERUP_SIZE / 2 + 25)) {
                    this.applyPowerup(powerup);
                    powerup.collected = true;
                }
            }
        }
    }
    
    applyPowerup(powerup) {
        switch(powerup.type) {
            case RACE_POWERUP_TYPES.HEART:
                const currentHealth = this.game.data.getHealth();
                if (currentHealth < GAME_CONFIG.INITIAL_HEALTH) {
                    this.game.data.setHealth(currentHealth + 1);
                }
                break;
                
            case RACE_POWERUP_TYPES.SHIELD:
                this.shield = true;
                break;
                
            case RACE_POWERUP_TYPES.SPEED:
                this.speedBoostTimer = 3000;
                this.slowTimer = 0;
                break;
                
            case RACE_POWERUP_TYPES.SLOW:
                this.slowTimer = 2000;
                this.speedBoostTimer = 0;
                break;
        }
    }
    
    spawnDoors() {
        this.doors = [];
        for (let i = 0; i < 3; i++) {
            this.doors.push({
                track: i,
                x: this.getTrackX(i) - 40,
                y: GAME_CONFIG.CANVAS_HEIGHT / 2 - 50,
                width: 80,
                height: 100
            });
        }
    }
    
    render(ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        if (this.freeMoveMode) {
            this.renderFreeMoveScene(ctx);
        } else if (this.isFinished) {
            this.renderFinish(ctx);
        } else {
            this.renderTracks(ctx);
            
            this.renderFinishLine(ctx);
            
            this.obstacles.forEach(obs => {
                this.renderObstacle(ctx, obs);
            });
            
            this.powerups.forEach(p => {
                if (!p.collected) {
                    this.renderPowerup(ctx, p);
                }
            });
            
            this.renderSnake(ctx);
            
            this.renderHUD(ctx);
        }
    }
    
    renderFinishLine(ctx) {
        if (this.finishLineY < -50 || this.finishLineY > GAME_CONFIG.CANVAS_HEIGHT + 50) return;
        
        const centerX = GAME_CONFIG.CANVAS_WIDTH / 2;
        const trackStartX = centerX - this.trackWidth * 1.5 - 30;
        const trackWidth = this.trackWidth * 3 + 60;
        
        ctx.save();
        
        ctx.fillStyle = '#fff';
        ctx.fillRect(trackStartX, this.finishLineY, trackWidth, 5);
        
        const squareSize = 15;
        const startY = this.finishLineY - squareSize;
        
        for (let x = trackStartX; x < trackStartX + trackWidth; x += squareSize) {
            const isEvenCol = Math.floor((x - trackStartX) / squareSize) % 2 === 0;
            ctx.fillStyle = isEvenCol ? '#000' : '#fff';
            ctx.fillRect(x, startY, squareSize, squareSize);
            
            ctx.fillStyle = isEvenCol ? '#fff' : '#000';
            ctx.fillRect(x, this.finishLineY, squareSize, squareSize);
        }
        
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('终点线', centerX, startY - 15);
        
        ctx.restore();
    }
    
    renderFreeMoveScene(ctx) {
        this.renderFreeMoveBackground(ctx);
        
        if (this.goldenApple && !this.goldenAppleCollected) {
            this.renderGoldenApple(ctx);
        }
        
        this.renderFreeMoveSnake(ctx);
        
        if (this.doorsOpen) {
            this.renderFinish(ctx);
        } else {
            this.renderFreeMoveHUD(ctx);
        }
    }
    
    renderFreeMoveBackground(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.CANVAS_HEIGHT);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#252540');
        gradient.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 20; i++) {
            const x = (i * 41 + this.trackOffset) % GAME_CONFIG.CANVAS_WIDTH;
            const y = (i * 31) % GAME_CONFIG.CANVAS_HEIGHT;
            ctx.fillRect(x, y, 2, 2);
        }
    }
    
    renderGoldenApple(ctx) {
        const x = this.goldenApple.x;
        const y = this.goldenApple.y;
        const glowRadius = Math.sin(this.goldenApple.glow) * 8 + 12;
        
        ctx.beginPath();
        ctx.arc(x, y, this.goldenApple.radius + glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x, y, this.goldenApple.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(x - 5, y - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('金苹果', x, y - this.goldenApple.radius - 15);
    }
    
    renderFreeMoveSnake(ctx) {
        for (let i = this.snakeFreeSegments.length - 1; i >= 0; i--) {
            const seg = this.snakeFreeSegments[i];
            const isHead = i === 0;
            const color = isHead ? '#06d6a0' : '#118ab2';
            
            ctx.fillStyle = color;
            
            const segWidth = isHead ? 30 : 25;
            const segHeight = isHead ? 30 : 25;
            
            ctx.fillRect(seg.x - segWidth / 2, seg.y - segHeight / 2, segWidth, segHeight);
            
            if (isHead) {
                if (this.shield) {
                    ctx.strokeStyle = '#4ecdc4';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(seg.x, seg.y, segWidth / 2 + 8, 0, Math.PI * 2);
                    ctx.stroke();
                }
                
                ctx.fillStyle = '#fff';
                const eyeSize = 4;
                
                if (this.snakeDirection.x === 1) {
                    ctx.fillRect(seg.x + 5, seg.y - 8, eyeSize, eyeSize);
                    ctx.fillRect(seg.x + 5, seg.y + 4, eyeSize, eyeSize);
                } else if (this.snakeDirection.x === -1) {
                    ctx.fillRect(seg.x - 9, seg.y - 8, eyeSize, eyeSize);
                    ctx.fillRect(seg.x - 9, seg.y + 4, eyeSize, eyeSize);
                } else if (this.snakeDirection.y === -1) {
                    ctx.fillRect(seg.x - 8, seg.y - 8, eyeSize, eyeSize);
                    ctx.fillRect(seg.x + 4, seg.y - 8, eyeSize, eyeSize);
                } else {
                    ctx.fillRect(seg.x - 8, seg.y + 4, eyeSize, eyeSize);
                    ctx.fillRect(seg.x + 4, seg.y + 4, eyeSize, eyeSize);
                }
                
                ctx.fillStyle = '#000';
                if (this.snakeDirection.x === 1) {
                    ctx.fillRect(seg.x + 6, seg.y - 7, 2, 2);
                    ctx.fillRect(seg.x + 6, seg.y + 5, 2, 2);
                } else if (this.snakeDirection.x === -1) {
                    ctx.fillRect(seg.x - 8, seg.y - 7, 2, 2);
                    ctx.fillRect(seg.x - 8, seg.y + 5, 2, 2);
                } else if (this.snakeDirection.y === -1) {
                    ctx.fillRect(seg.x - 7, seg.y - 7, 2, 2);
                    ctx.fillRect(seg.x + 5, seg.y - 7, 2, 2);
                } else {
                    ctx.fillRect(seg.x - 7, seg.y + 5, 2, 2);
                    ctx.fillRect(seg.x + 5, seg.y + 5, 2, 2);
                }
            }
            
            ctx.strokeStyle = '#073b4c';
            ctx.lineWidth = 2;
            ctx.strokeRect(seg.x - segWidth / 2, seg.y - segHeight / 2, segWidth, segHeight);
        }
    }
    
    renderFreeMoveHUD(ctx) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 24px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 赛蛇完成！', GAME_CONFIG.CANVAS_WIDTH / 2, 40);
        
        ctx.fillStyle = '#fff';
        ctx.font = '16px Courier New';
        ctx.fillText('使用方向键移动蛇，吃掉金苹果！', GAME_CONFIG.CANVAS_WIDTH / 2, 70);
        
        ctx.fillStyle = '#888';
        ctx.font = '14px Courier New';
        ctx.fillText('↑↓←→ 或 WASD 移动', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT - 20);
    }
    
    renderTracks(ctx) {
        const centerX = GAME_CONFIG.CANVAS_WIDTH / 2;
        
        ctx.fillStyle = '#2d2d44';
        ctx.fillRect(
            centerX - this.trackWidth * 1.5 - 30,
            0,
            this.trackWidth * 3 + 60,
            GAME_CONFIG.CANVAS_HEIGHT
        );
        
        ctx.strokeStyle = '#4a4a6a';
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 15]);
        
        for (let i = -1; i <= 1; i++) {
            const x = centerX + i * this.trackWidth;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, GAME_CONFIG.CANVAS_HEIGHT);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
        
        ctx.fillStyle = '#00ff8820';
        const stripeOffset = (this.trackOffset % 100);
        for (let y = -100 + stripeOffset; y < GAME_CONFIG.CANVAS_HEIGHT + 100; y += 100) {
            for (let track = 0; track < 3; track++) {
                const x = this.getTrackX(track);
                ctx.beginPath();
                ctx.moveTo(x - 30, y);
                ctx.lineTo(x + 30, y);
                ctx.lineTo(x, y + 30);
                ctx.closePath();
                ctx.fill();
            }
        }
    }
    
    renderObstacle(ctx, obs) {
        const x = this.getTrackX(obs.track);
        const y = obs.y;
        
        ctx.save();
        
        switch(obs.type) {
            case RACE_OBSTACLE_TYPES.WALL:
                ctx.fillStyle = '#666';
                ctx.fillRect(x - obs.width / 2, y, obs.width, obs.height);
                ctx.fillStyle = '#888';
                ctx.fillRect(x - obs.width / 2 + 5, y + 5, 10, 10);
                ctx.fillRect(x + 5, y + 15, 15, 10);
                break;
                
            case RACE_OBSTACLE_TYPES.SPIKE:
                ctx.fillStyle = '#ff4444';
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x - obs.width / 2, y + obs.height);
                ctx.lineTo(x + obs.width / 2, y + obs.height);
                ctx.closePath();
                ctx.fill();
                
                ctx.fillStyle = '#ff8888';
                ctx.beginPath();
                ctx.moveTo(x, y + 10);
                ctx.lineTo(x - 10, y + obs.height - 5);
                ctx.lineTo(x + 10, y + obs.height - 5);
                ctx.closePath();
                ctx.fill();
                break;
                
            case RACE_OBSTACLE_TYPES.BARREL:
                ctx.fillStyle = '#8B4513';
                ctx.beginPath();
                ctx.ellipse(x, y + obs.height / 2, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = '#5D3A1A';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(x, y + obs.height / 2, obs.width / 2 - 5, obs.height / 2 - 5, 0, 0, Math.PI * 2);
                ctx.stroke();
                break;
        }
        
        ctx.restore();
    }
    
    renderPowerup(ctx, powerup) {
        const x = this.getTrackX(powerup.track);
        const y = powerup.y;
        const glowRadius = Math.sin(powerup.glow) * 8 + 10;
        
        let color, emoji;
        switch(powerup.type) {
            case RACE_POWERUP_TYPES.HEART:
                color = '#ff6b6b';
                emoji = '❤️';
                break;
            case RACE_POWERUP_TYPES.SHIELD:
                color = '#4ecdc4';
                emoji = '🛡️';
                break;
            case RACE_POWERUP_TYPES.SPEED:
                color = '#ffe66d';
                emoji = '⚡';
                break;
            case RACE_POWERUP_TYPES.SLOW:
                color = '#95e1d3';
                emoji = '🐢';
                break;
        }
        
        ctx.beginPath();
        ctx.arc(x, y + RACE_POWERUP_SIZE / 2, RACE_POWERUP_SIZE / 2 + glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${color}30`;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x, y + RACE_POWERUP_SIZE / 2, RACE_POWERUP_SIZE / 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, x, y + RACE_POWERUP_SIZE / 2);
    }
    
    renderSnake(ctx) {
        const headY = GAME_CONFIG.CANVAS_HEIGHT - 80;
        
        for (let i = this.snakeSegments.length - 1; i >= 0; i--) {
            const seg = this.snakeSegments[i];
            const x = this.getTrackX(seg.track);
            const y = headY + i * (RACE_SEGMENT_SIZE - 10);
            
            const isHead = i === 0;
            const color = isHead ? '#06d6a0' : '#118ab2';
            
            ctx.fillStyle = color;
            
            const segWidth = isHead ? 45 : 40;
            const segHeight = isHead ? 45 : 35;
            
            ctx.fillRect(x - segWidth / 2, y - segHeight / 2, segWidth, segHeight);
            
            if (isHead) {
                if (this.shield) {
                    ctx.strokeStyle = '#4ecdc4';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(x, y, segWidth / 2 + 10, 0, Math.PI * 2);
                    ctx.stroke();
                }
                
                ctx.fillStyle = '#fff';
                const eyeSize = 6;
                ctx.fillRect(x - 15, y - 12, eyeSize, eyeSize);
                ctx.fillRect(x + 9, y - 12, eyeSize, eyeSize);
                
                ctx.fillStyle = '#000';
                ctx.fillRect(x - 13, y - 10, 3, 3);
                ctx.fillRect(x + 11, y - 10, 3, 3);
            }
            
            ctx.strokeStyle = '#073b4c';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - segWidth / 2, y - segHeight / 2, segWidth, segHeight);
        }
    }
    
    renderHUD(ctx) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText('进度: ' + Math.floor(this.progress) + '%', 20, 30);
        
        const barWidth = 200;
        const barX = GAME_CONFIG.CANVAS_WIDTH - barWidth - 20;
        const barY = 20;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, 20);
        
        ctx.fillStyle = '#06d6a0';
        ctx.fillRect(barX, barY, barWidth * (this.progress / this.targetProgress), 20);
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, 20);
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('← → 切换赛道', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT - 20);
        
        const statusItems = [];
        if (this.shield) {
            statusItems.push('🛡️ 护盾');
        }
        if (this.speedBoostTimer > 0) {
            statusItems.push('⚡ 加速中');
        }
        if (this.slowTimer > 0) {
            statusItems.push('🐢 减速中');
        }
        
        if (statusItems.length > 0) {
            ctx.fillStyle = '#ffd700';
            ctx.font = '14px Courier New';
            ctx.textAlign = 'left';
            ctx.fillText(statusItems.join('  '), 20, 55);
        }
    }
    
    renderFinish(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.CANVAS_HEIGHT);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#2d2d44');
        gradient.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 36px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 赛蛇完成！', GAME_CONFIG.CANVAS_WIDTH / 2, 80);
        
        ctx.fillStyle = '#fff';
        ctx.font = '18px Courier New';
        ctx.fillText('选择一扇门进入下一个房间', GAME_CONFIG.CANVAS_WIDTH / 2, 130);
        
        ctx.font = '40px Arial';
        ctx.fillText('🍎', GAME_CONFIG.CANVAS_WIDTH / 2, 180);
        
        ctx.font = '14px Courier New';
        ctx.fillText('获得金苹果！', GAME_CONFIG.CANVAS_WIDTH / 2, 210);
        
        for (let i = 0; i < 3; i++) {
            const door = this.doors[i];
            const isSelected = i === this.selectedDoor;
            const pulseScale = isSelected ? 1 + Math.sin(this.doorAnimation * 3) * 0.05 : 1;
            
            ctx.save();
            ctx.translate(door.x + door.width / 2, door.y + door.height / 2);
            ctx.scale(pulseScale, pulseScale);
            
            const doorLabels = ['左门', '中门', '右门'];
            const doorEmojis = ['⬅️', '⏺️', '➡️'];
            
            ctx.fillStyle = isSelected ? '#ffd700' : '#4a4a6a';
            ctx.fillRect(-door.width / 2, -door.height / 2, door.width, door.height);
            
            ctx.strokeStyle = isSelected ? '#fff' : '#666';
            ctx.lineWidth = isSelected ? 4 : 2;
            ctx.strokeRect(-door.width / 2, -door.height / 2, door.width, door.height);
            
            ctx.font = '30px Arial';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(doorEmojis[i], 0, -10);
            
            ctx.font = '12px Courier New';
            ctx.fillText(doorLabels[i], 0, 35);
            
            if (isSelected) {
                ctx.font = '14px Courier New';
                ctx.fillStyle = '#00ff88';
                ctx.fillText('按空格确认', 0, door.height / 2 + 25);
            }
            
            ctx.restore();
        }
        
        ctx.fillStyle = '#888';
        ctx.font = '14px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('← → 选择门 | 空格/Enter 确认', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT - 30);
    }
}

window.RaceRoom = RaceRoom;
