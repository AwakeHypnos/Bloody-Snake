class ShooterRoom extends BaseRoomPlugin {
    constructor(game) {
        super(game);
        this.roomType = ROOM_TYPES.SHOOTER;
        
        this.player = {
            x: 100,
            y: GAME_CONFIG.CANVAS_HEIGHT / 2,
            width: 40,
            height: 40,
            speed: 5,
            shootTimer: 0,
            shootCooldown: 200
        };
        
        this.bullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.boss = null;
        this.bossDefeated = false;
        
        this.apple = null;
        this.appleCollected = false;
        this.exitDoor = null;
        
        this.backgroundOffset = 0;
        this.waveTimer = 0;
        this.waveInterval = 3000;
        this.wavesSpawned = 0;
        this.totalWaves = 3;
        
        this.stars = [];
        for (let i = 0; i < 50; i++) {
            this.stars.push({
                x: Math.random() * GAME_CONFIG.CANVAS_WIDTH,
                y: Math.random() * GAME_CONFIG.CANVAS_HEIGHT,
                size: Math.random() * 3 + 1,
                speed: Math.random() * 2 + 1
            });
        }
    }
    
    spawnEnemy() {
        const enemyType = Math.random();
        
        if (enemyType < 0.5) {
            this.enemies.push({
                x: GAME_CONFIG.CANVAS_WIDTH + 50,
                y: Math.random() * (GAME_CONFIG.CANVAS_HEIGHT - 100) + 50,
                width: 30,
                height: 30,
                health: 2,
                speed: 2,
                type: 'basic',
                shootTimer: 0,
                shootCooldown: 1500
            });
        } else {
            this.enemies.push({
                x: GAME_CONFIG.CANVAS_WIDTH + 50,
                y: Math.random() * (GAME_CONFIG.CANVAS_HEIGHT - 100) + 50,
                width: 40,
                height: 40,
                health: 4,
                speed: 1.5,
                type: 'fast',
                shootTimer: 0,
                shootCooldown: 1000
            });
        }
    }
    
    spawnBoss() {
        this.boss = {
            x: GAME_CONFIG.CANVAS_WIDTH - 150,
            y: GAME_CONFIG.CANVAS_HEIGHT / 2 - 60,
            width: 120,
            height: 120,
            health: 30,
            maxHealth: 30,
            moveDirection: 1,
            shootTimer: 0,
            shootCooldown: 800,
            patternTimer: 0,
            pattern: 0
        };
    }
    
    spawnApple() {
        this.apple = {
            x: GAME_CONFIG.CANVAS_WIDTH - 100,
            y: GAME_CONFIG.CANVAS_HEIGHT / 2,
            width: 30,
            height: 30,
            glow: 0
        };
    }
    
    spawnExitDoor() {
        this.exitDoor = {
            x: GAME_CONFIG.CANVAS_WIDTH - 40,
            y: GAME_CONFIG.CANVAS_HEIGHT / 2 - 40,
            width: 40,
            height: 80
        };
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        this.backgroundOffset += 2;
        if (this.backgroundOffset > GAME_CONFIG.CANVAS_WIDTH) {
            this.backgroundOffset = 0;
        }
        
        this.stars.forEach(star => {
            star.x -= star.speed;
            if (star.x < 0) {
                star.x = GAME_CONFIG.CANVAS_WIDTH;
                star.y = Math.random() * GAME_CONFIG.CANVAS_HEIGHT;
            }
        });
        
        this.handleInput();
        
        if (this.player.shootTimer > 0) {
            this.player.shootTimer -= deltaTime;
        }
        
        if (this.game.keys[' '] && this.player.shootTimer <= 0) {
            this.shoot();
            this.player.shootTimer = this.player.shootCooldown;
        }
        
        this.updateBullets(deltaTime);
        
        if (!this.bossDefeated) {
            if (!this.boss) {
                this.waveTimer += deltaTime;
                if (this.waveTimer >= this.waveInterval && this.wavesSpawned < this.totalWaves) {
                    this.waveTimer = 0;
                    this.wavesSpawned++;
                    const enemyCount = Math.floor(Math.random() * 3) + 2;
                    for (let i = 0; i < enemyCount; i++) {
                        this.spawnEnemy();
                    }
                }
                
                if (this.wavesSpawned >= this.totalWaves && this.enemies.length === 0) {
                    this.spawnBoss();
                }
            } else {
                this.updateBoss(deltaTime);
            }
            
            this.updateEnemies(deltaTime);
            this.checkCollisions();
        } else {
            if (this.apple && !this.appleCollected) {
                this.apple.glow = (this.apple.glow + deltaTime / 200) % (Math.PI * 2);
                this.checkAppleCollection();
            }
            
            if (this.exitDoor) {
                this.checkDoorCollision();
            }
        }
    }
    
    handleInput() {
        if (this.game.keys['ArrowUp'] && this.player.y > 50) {
            this.player.y -= this.player.speed;
        }
        if (this.game.keys['ArrowDown'] && this.player.y < GAME_CONFIG.CANVAS_HEIGHT - this.player.height - 10) {
            this.player.y += this.player.speed;
        }
        if (this.game.keys['ArrowLeft'] && this.player.x > 10) {
            this.player.x -= this.player.speed;
        }
        const maxX = this.bossDefeated ? GAME_CONFIG.CANVAS_WIDTH - this.player.width - 10 : GAME_CONFIG.CANVAS_WIDTH / 2;
        if (this.game.keys['ArrowRight'] && this.player.x < maxX) {
            this.player.x += this.player.speed;
        }
    }
    
    shoot() {
        this.bullets.push({
            x: this.player.x + this.player.width,
            y: this.player.y + this.player.height / 2 - 5,
            width: 15,
            height: 10,
            speed: 10
        });
    }
    
    updateBullets(deltaTime) {
        this.bullets = this.bullets.filter(bullet => {
            bullet.x += bullet.speed;
            return bullet.x < GAME_CONFIG.CANVAS_WIDTH + 50;
        });
        
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            return bullet.x > -50 && bullet.x < GAME_CONFIG.CANVAS_WIDTH + 50 &&
                   bullet.y > -50 && bullet.y < GAME_CONFIG.CANVAS_HEIGHT + 50;
        });
    }
    
    updateEnemies(deltaTime) {
        this.enemies = this.enemies.filter(enemy => {
            enemy.x -= enemy.speed;
            enemy.shootTimer += deltaTime;
            
            if (enemy.shootTimer >= enemy.shootCooldown) {
                enemy.shootTimer = 0;
                this.enemyShoot(enemy);
            }
            
            return enemy.x > -100 && enemy.health > 0;
        });
    }
    
    updateBoss(deltaTime) {
        this.boss.y += this.boss.moveDirection * 2;
        
        if (this.boss.y <= 50 || this.boss.y >= GAME_CONFIG.CANVAS_HEIGHT - this.boss.height - 50) {
            this.boss.moveDirection *= -1;
        }
        
        this.boss.shootTimer += deltaTime;
        this.boss.patternTimer += deltaTime;
        
        if (this.boss.patternTimer >= 3000) {
            this.boss.patternTimer = 0;
            this.boss.pattern = (this.boss.pattern + 1) % 3;
        }
        
        if (this.boss.shootTimer >= this.boss.shootCooldown) {
            this.boss.shootTimer = 0;
            this.bossShoot();
        }
    }
    
    enemyShoot(enemy) {
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = 1.25;
        
        this.enemyBullets.push({
            x: enemy.x,
            y: enemy.y + enemy.height / 2,
            width: 10,
            height: 10,
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed
        });
    }
    
    bossShoot() {
        const centerX = this.boss.x;
        const centerY = this.boss.y + this.boss.height / 2;
        
        switch(this.boss.pattern) {
            case 0:
                for (let angle = 0; angle < 360; angle += 45) {
                    const rad = angle * Math.PI / 180;
                    this.enemyBullets.push({
                        x: centerX,
                        y: centerY,
                        width: 12,
                        height: 12,
                        vx: Math.cos(rad) * 1,
                        vy: Math.sin(rad) * 1
                    });
                }
                break;
                
            case 1:
                const dx = this.player.x - centerX;
                const dy = this.player.y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                for (let i = -1; i <= 1; i++) {
                    this.enemyBullets.push({
                        x: centerX,
                        y: centerY,
                        width: 12,
                        height: 12,
                        vx: (dx / dist) * 1.25 + i * 0.25,
                        vy: (dy / dist) * 1.25
                    });
                }
                break;
                
            case 2:
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => {
                        if (this.boss) {
                            const dx2 = this.player.x - this.boss.x;
                            const dy2 = this.player.y - (this.boss.y + this.boss.height / 2);
                            const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                            this.enemyBullets.push({
                                x: this.boss.x,
                                y: this.boss.y + this.boss.height / 2,
                                width: 15,
                                height: 8,
                                vx: (dx2 / dist2) * 1.75,
                                vy: (dy2 / dist2) * 1.75
                            });
                        }
                    }, i * 150);
                }
                break;
        }
    }
    
    checkCollisions() {
        this.bullets.forEach((bullet, bulletIndex) => {
            this.enemies.forEach((enemy, enemyIndex) => {
                if (CollisionUtils.checkRectCollision(bullet, enemy)) {
                    enemy.health--;
                    this.bullets.splice(bulletIndex, 1);
                    if (enemy.health <= 0) {
                        this.enemies.splice(enemyIndex, 1);
                    }
                }
            });
            
            if (this.boss && CollisionUtils.checkRectCollision(bullet, this.boss)) {
                this.boss.health--;
                this.bullets.splice(bulletIndex, 1);
                if (this.boss.health <= 0) {
                    this.bossDefeated = true;
                    this.boss = null;
                    this.spawnApple();
                }
            }
        });
        
        this.enemyBullets.forEach((bullet, index) => {
            if (CollisionUtils.checkRectCollision(bullet, this.player)) {
                this.enemyBullets.splice(index, 1);
                this.game.data.takeDamage();
            }
        });
    }
    
    checkAppleCollection() {
        if (CollisionUtils.checkRectCollision(this.player, this.apple)) {
            this.appleCollected = true;
            this.apple = null;
            this.spawnExitDoor();
        }
    }
    
    checkDoorCollision() {
        if (CollisionUtils.checkRectCollision(this.player, this.exitDoor)) {
            this.roomComplete();
        }
    }
    
    render(ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        this.stars.forEach(star => {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.3})`;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        });
        
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, 40);
        ctx.fillRect(0, GAME_CONFIG.CANVAS_HEIGHT - 30, GAME_CONFIG.CANVAS_WIDTH, 30);
        
        this.enemyBullets.forEach(bullet => {
            ctx.fillStyle = '#e94560';
            ctx.beginPath();
            ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, bullet.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.arc(bullet.x + bullet.width / 2 - 2, bullet.y + bullet.height / 2 - 2, bullet.width / 4, 0, Math.PI * 2);
            ctx.fill();
        });
        
        this.enemies.forEach(enemy => {
            this.renderEnemy(ctx, enemy);
        });
        
        if (this.boss) {
            this.renderBoss(ctx);
        }
        
        this.bullets.forEach(bullet => {
            ctx.fillStyle = '#4cc9f0';
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            
            ctx.fillStyle = '#7dd3fc';
            ctx.fillRect(bullet.x + 2, bullet.y + 2, bullet.width - 4, bullet.height - 4);
        });
        
        if (this.shouldRenderPlayer()) {
            this.renderPlayer(ctx);
        }
        
        if (this.apple) {
            this.renderApple(ctx);
        }
        
        if (this.exitDoor) {
            this.renderExitDoor(ctx);
        }
        
        this.renderHUD(ctx);
    }
    
    renderPlayer(ctx) {
        const x = this.player.x;
        const y = this.player.y;
        const w = this.player.width;
        const h = this.player.height;
        const segmentSize = 8;
        
        const snakeSegments = [
            { x: x + w - 5, y: y + h / 2 - segmentSize / 2, w: segmentSize, h: segmentSize, isHead: true },
            { x: x + w - 15, y: y + h / 2 - segmentSize / 2, w: segmentSize, h: segmentSize, isHead: false },
            { x: x + w - 25, y: y + h / 2 - segmentSize / 2, w: segmentSize, h: segmentSize, isHead: false },
            { x: x + w - 25, y: y + h / 2 - segmentSize * 2, w: segmentSize, h: segmentSize, isHead: false },
            { x: x + w - 25, y: y + h / 2 + segmentSize, w: segmentSize, h: segmentSize, isHead: false },
            { x: x + w - 35, y: y + h / 2 - segmentSize / 2, w: segmentSize, h: segmentSize, isHead: false },
            { x: x + w - 35, y: y + h / 2 - segmentSize * 3, w: segmentSize, h: segmentSize, isHead: false },
            { x: x + w - 35, y: y + h / 2 + segmentSize * 2, w: segmentSize, h: segmentSize, isHead: false },
        ];
        
        snakeSegments.forEach((seg, index) => {
            if (seg.isHead) {
                ctx.fillStyle = '#06d6a0';
                ctx.fillRect(seg.x, seg.y, seg.w, seg.h);
                
                ctx.fillStyle = '#fff';
                ctx.fillRect(seg.x + 2, seg.y + 1, 2, 2);
                ctx.fillRect(seg.x + 2, seg.y + 5, 2, 2);
            } else {
                ctx.fillStyle = '#118ab2';
                ctx.fillRect(seg.x, seg.y, seg.w, seg.h);
            }
        });
        
        ctx.fillStyle = '#ff6b6b';
        const flameOffset = Math.random() * 5;
        ctx.beginPath();
        ctx.moveTo(x + w - 40, y + h / 2 - 5);
        ctx.lineTo(x + w - 50 - flameOffset, y + h / 2);
        ctx.lineTo(x + w - 40, y + h / 2 + 5);
        ctx.closePath();
        ctx.fill();
    }
    
    renderEnemy(ctx, enemy) {
        const x = enemy.x;
        const y = enemy.y;
        
        if (enemy.type === 'basic') {
            ctx.fillStyle = '#e94560';
            ctx.fillRect(x, y, enemy.width, enemy.height);
            
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + 5, y + 8, 6, 6);
            ctx.fillRect(x + 19, y + 8, 6, 6);
            
            ctx.fillStyle = '#000';
            ctx.fillRect(x + 7, y + 10, 3, 3);
            ctx.fillRect(x + 21, y + 10, 3, 3);
        } else {
            ctx.fillStyle = '#9b5de5';
            ctx.beginPath();
            ctx.moveTo(x, y + enemy.height / 2);
            ctx.lineTo(x + enemy.width, y);
            ctx.lineTo(x + enemy.width, y + enemy.height);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#f15bb5';
            ctx.beginPath();
            ctx.arc(x + enemy.width / 2, y + enemy.height / 2, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    renderBoss(ctx) {
        const x = this.boss.x;
        const y = this.boss.y;
        
        ctx.fillStyle = '#f72585';
        ctx.fillRect(x, y, this.boss.width, this.boss.height);
        
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(x + 10, y + 10, this.boss.width - 20, this.boss.height - 20);
        
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 20, y + 30, 25, 25);
        ctx.fillRect(x + 75, y + 30, 25, 25);
        
        ctx.fillStyle = '#000';
        const eyeXOffset = Math.sin(Date.now() / 200) * 5;
        ctx.fillRect(x + 28 + eyeXOffset, y + 38, 10, 10);
        ctx.fillRect(x + 83 + eyeXOffset, y + 38, 10, 10);
        
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y - 20, this.boss.width, 10);
        
        const healthPercent = this.boss.health / this.boss.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#06d6a0' : healthPercent > 0.25 ? '#ffd700' : '#e94560';
        ctx.fillRect(x, y - 20, this.boss.width * healthPercent, 10);
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y - 20, this.boss.width, 10);
    }
    
    renderApple(ctx) {
        const x = this.apple.x;
        const y = this.apple.y;
        const glow = Math.sin(this.apple.glow) * 5 + 5;
        
        ctx.beginPath();
        ctx.arc(x + this.apple.width / 2, y + this.apple.height / 2, this.apple.width / 2 + glow, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.fill();
        
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(x + this.apple.width / 2, y + this.apple.height / 2, this.apple.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + this.apple.width / 2 - 5, y + this.apple.height / 2 - 5, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderExitDoor(ctx) {
        const x = this.exitDoor.x;
        const y = this.exitDoor.y;
        
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x, y, this.exitDoor.width, this.exitDoor.height);
        
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x + 5, y + 5, this.exitDoor.width - 10, this.exitDoor.height - 10);
        
        ctx.fillStyle = '#ffd700';
        ctx.font = '20px Arial';
        ctx.fillText('→', x + 8, y + this.exitDoor.height / 2 + 7);
    }
    
    renderHUD(ctx) {
        if (this.boss) {
            ctx.fillStyle = '#fff';
            ctx.font = '16px Courier New';
            ctx.fillText('BOSS 战斗中！', GAME_CONFIG.CANVAS_WIDTH / 2 - 50, 30);
        } else if (!this.bossDefeated) {
            ctx.fillStyle = '#fff';
            ctx.font = '16px Courier New';
            ctx.fillText(`波次: ${this.wavesSpawned}/${this.totalWaves}`, GAME_CONFIG.CANVAS_WIDTH / 2 - 40, 30);
        } else if (this.apple) {
            ctx.fillStyle = '#ffd700';
            ctx.font = '16px Courier New';
            ctx.fillText('收集金苹果！', GAME_CONFIG.CANVAS_WIDTH / 2 - 50, 30);
        } else if (this.exitDoor) {
            ctx.fillStyle = '#06d6a0';
            ctx.font = '16px Courier New';
            ctx.fillText('向右进入出口！', GAME_CONFIG.CANVAS_WIDTH / 2 - 60, 30);
        }
    }
}

window.ShooterRoom = ShooterRoom;
