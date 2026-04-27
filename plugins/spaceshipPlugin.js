class SpaceshipRoom extends BaseRoomPlugin {
    constructor(game) {
        super(game);
        this.roomType = ROOM_TYPES.SPACESHIP;
        
        this.player = {
            x: GAME_CONFIG.CANVAS_WIDTH / 2 - 25,
            y: GAME_CONFIG.CANVAS_HEIGHT - 100,
            width: 50,
            height: 60,
            speed: 5,
            shootTimer: 0,
            shootCooldown: 250
        };
        
        this.bullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.boss = null;
        this.bossDefeated = false;
        
        this.apple = null;
        this.appleCollected = false;
        this.exitDoor = null;
        
        this.waveTimer = 0;
        this.waveInterval = 2500;
        this.wavesSpawned = 0;
        this.totalWaves = 4;
        
        this.stars = [];
        for (let i = 0; i < 80; i++) {
            this.stars.push({
                x: Math.random() * GAME_CONFIG.CANVAS_WIDTH,
                y: Math.random() * GAME_CONFIG.CANVAS_HEIGHT,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 3 + 1
            });
        }
        
        this.comicBubbles = [];
        this.bubbleTimer = 0;
    }
    
    spawnEnemy() {
        const enemyType = Math.random();
        
        if (enemyType < 0.4) {
            this.enemies.push({
                x: Math.random() * (GAME_CONFIG.CANVAS_WIDTH - 60) + 30,
                y: -60,
                width: 50,
                height: 40,
                health: 3,
                speed: 1.5,
                type: 'ufo',
                shootTimer: 0,
                shootCooldown: 2000
            });
        } else {
            this.enemies.push({
                x: Math.random() * (GAME_CONFIG.CANVAS_WIDTH - 50) + 25,
                y: -50,
                width: 40,
                height: 50,
                health: 4,
                speed: 1,
                type: 'plane',
                shootTimer: 0,
                shootCooldown: 1500
            });
        }
    }
    
    spawnBoss() {
        this.boss = {
            x: GAME_CONFIG.CANVAS_WIDTH / 2 - 80,
            y: 50,
            width: 160,
            height: 100,
            health: 50,
            maxHealth: 50,
            moveDirection: 1,
            shootTimer: 0,
            shootCooldown: 1000,
            patternTimer: 0,
            pattern: 0,
            beamTimer: 0
        };
    }
    
    spawnApple() {
        this.apple = {
            x: GAME_CONFIG.CANVAS_WIDTH / 2 - 20,
            y: 80,
            width: 40,
            height: 40,
            glow: 0
        };
    }
    
    spawnExitDoor() {
        this.exitDoor = {
            x: GAME_CONFIG.CANVAS_WIDTH / 2 - 50,
            y: 10,
            width: 100,
            height: 50
        };
    }
    
    addComicBubble(text, x, y) {
        this.comicBubbles.push({
            text: text,
            x: x,
            y: y,
            life: 2000,
            maxLife: 2000
        });
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        this.stars.forEach(star => {
            star.y += star.speed;
            if (star.y > GAME_CONFIG.CANVAS_HEIGHT) {
                star.y = 0;
                star.x = Math.random() * GAME_CONFIG.CANVAS_WIDTH;
            }
        });
        
        this.comicBubbles = this.comicBubbles.filter(bubble => {
            bubble.life -= deltaTime;
            bubble.y -= 0.5;
            return bubble.life > 0;
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
                    const enemyCount = Math.floor(Math.random() * 4) + 2;
                    for (let i = 0; i < enemyCount; i++) {
                        setTimeout(() => this.spawnEnemy(), i * 300);
                    }
                }
                
                if (this.wavesSpawned >= this.totalWaves && this.enemies.length === 0) {
                    this.spawnBoss();
                    this.addComicBubble('BOSS出现！', GAME_CONFIG.CANVAS_WIDTH / 2 - 50, GAME_CONFIG.CANVAS_HEIGHT / 2);
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
        if (this.game.keys['ArrowUp'] && this.player.y > 100) {
            this.player.y -= this.player.speed;
        }
        if (this.game.keys['ArrowDown'] && this.player.y < GAME_CONFIG.CANVAS_HEIGHT - this.player.height - 10) {
            this.player.y += this.player.speed;
        }
        if (this.game.keys['ArrowLeft'] && this.player.x > 10) {
            this.player.x -= this.player.speed;
        }
        if (this.game.keys['ArrowRight'] && this.player.x < GAME_CONFIG.CANVAS_WIDTH - this.player.width - 10) {
            this.player.x += this.player.speed;
        }
    }
    
    shoot() {
        this.bullets.push({
            x: this.player.x + this.player.width / 2 - 4,
            y: this.player.y - 10,
            width: 8,
            height: 20,
            speed: 12
        });
    }
    
    updateBullets(deltaTime) {
        this.bullets = this.bullets.filter(bullet => {
            bullet.y -= bullet.speed;
            return bullet.y > -50;
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
            enemy.y += enemy.speed;
            
            if (enemy.type === 'ufo') {
                enemy.x += Math.sin(Date.now() / 500) * 1.5;
            }
            
            enemy.shootTimer += deltaTime;
            
            if (enemy.shootTimer >= enemy.shootCooldown) {
                enemy.shootTimer = 0;
                this.enemyShoot(enemy);
            }
            
            return enemy.y < GAME_CONFIG.CANVAS_HEIGHT + 100 && enemy.health > 0;
        });
    }
    
    updateBoss(deltaTime) {
        this.boss.x += this.boss.moveDirection * 3;
        
        if (this.boss.x <= 30 || this.boss.x >= GAME_CONFIG.CANVAS_WIDTH - this.boss.width - 30) {
            this.boss.moveDirection *= -1;
        }
        
        this.boss.shootTimer += deltaTime;
        this.boss.patternTimer += deltaTime;
        this.boss.beamTimer += deltaTime;
        
        if (this.boss.patternTimer >= 4000) {
            this.boss.patternTimer = 0;
            this.boss.pattern = (this.boss.pattern + 1) % 3;
        }
        
        if (this.boss.shootTimer >= this.boss.shootCooldown) {
            this.boss.shootTimer = 0;
            this.bossShoot();
        }
    }
    
    enemyShoot(enemy) {
        const dx = this.player.x + this.player.width / 2 - (enemy.x + enemy.width / 2);
        const dy = this.player.y - (enemy.y + enemy.height);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = 1.25;
        
        this.enemyBullets.push({
            x: enemy.x + enemy.width / 2 - 6,
            y: enemy.y + enemy.height,
            width: 12,
            height: 12,
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed
        });
    }
    
    bossShoot() {
        const centerX = this.boss.x + this.boss.width / 2;
        const centerY = this.boss.y + this.boss.height;
        
        switch(this.boss.pattern) {
            case 0:
                for (let i = -2; i <= 2; i++) {
                    const angle = 90 + i * 15;
                    const rad = angle * Math.PI / 180;
                    this.enemyBullets.push({
                        x: centerX - 8,
                        y: centerY,
                        width: 16,
                        height: 16,
                        vx: Math.cos(rad) * 1,
                        vy: Math.sin(rad) * 1
                    });
                }
                break;
                
            case 1:
                const dx = this.player.x - centerX;
                const dy = this.player.y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        if (this.boss) {
                            this.enemyBullets.push({
                                x: this.boss.x + this.boss.width / 2 - 10,
                                y: this.boss.y + this.boss.height,
                                width: 20,
                                height: 10,
                                vx: 0,
                                vy: 2
                            });
                        }
                    }, i * 200);
                }
                break;
                
            case 2:
                for (let angle = 0; angle < 360; angle += 30) {
                    const rad = angle * Math.PI / 180;
                    this.enemyBullets.push({
                        x: centerX - 7,
                        y: centerY,
                        width: 14,
                        height: 14,
                        vx: Math.cos(rad) * 0.75,
                        vy: Math.sin(rad) * 0.75
                    });
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
                        this.addComicBubble('POW!', enemy.x, enemy.y);
                    }
                }
            });
            
            if (this.boss && CollisionUtils.checkRectCollision(bullet, this.boss)) {
                this.boss.health--;
                this.bullets.splice(bulletIndex, 1);
                if (this.boss.health <= 0) {
                    this.bossDefeated = true;
                    this.boss = null;
                    this.addComicBubble('KABOOM!', GAME_CONFIG.CANVAS_WIDTH / 2 - 60, 100);
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
            this.addComicBubble('GOT IT!', this.player.x, this.player.y - 30);
        }
    }
    
    checkDoorCollision() {
        if (CollisionUtils.checkRectCollision(this.player, this.exitDoor)) {
            this.roomComplete();
        }
    }
    
    render(ctx) {
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        this.stars.forEach(star => {
            const brightness = 0.3 + Math.random() * 0.4;
            ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        this.renderComicStyleBackground(ctx);
        
        this.enemyBullets.forEach(bullet => {
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, bullet.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        
        this.enemies.forEach(enemy => {
            this.renderEnemy(ctx, enemy);
        });
        
        if (this.boss) {
            this.renderBoss(ctx);
        }
        
        this.bullets.forEach(bullet => {
            ctx.fillStyle = '#06d6a0';
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(bullet.x, bullet.y, bullet.width, bullet.height);
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
        
        this.comicBubbles.forEach(bubble => {
            this.renderComicBubble(ctx, bubble);
        });
        
        this.renderHUD(ctx);
    }
    
    renderComicStyleBackground(ctx) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.05)';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < GAME_CONFIG.CANVAS_WIDTH; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, GAME_CONFIG.CANVAS_HEIGHT);
            ctx.stroke();
        }
        
        for (let y = 0; y < GAME_CONFIG.CANVAS_HEIGHT; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH, y);
            ctx.stroke();
        }
    }
    
    renderPlayer(ctx) {
        const x = this.player.x;
        const y = this.player.y;
        const w = this.player.width;
        const h = this.player.height;
        const segmentSize = 8;
        
        const snakeSegments = [
            { x: x + w / 2 - segmentSize / 2, y: y, w: segmentSize, h: segmentSize, isHead: true },
            { x: x + w / 2 - segmentSize / 2, y: y + segmentSize, w: segmentSize, h: segmentSize, isHead: false },
            { x: x + w / 2 - segmentSize / 2, y: y + segmentSize * 2, w: segmentSize, h: segmentSize, isHead: false },
            { x: x + w / 2 - segmentSize / 2, y: y + segmentSize * 3, w: segmentSize, h: segmentSize, isHead: false },
            { x: x + w / 2 - segmentSize * 1.5, y: y + segmentSize * 2, w: segmentSize, h: segmentSize, isHead: false },
            { x: x + w / 2 + segmentSize / 2, y: y + segmentSize * 2, w: segmentSize, h: segmentSize, isHead: false },
            { x: x + w / 2 - segmentSize * 2, y: y + segmentSize * 3, w: segmentSize, h: segmentSize, isHead: false },
            { x: x + w / 2 + segmentSize, y: y + segmentSize * 3, w: segmentSize, h: segmentSize, isHead: false },
            { x: x + w / 2 - segmentSize * 2.5, y: y + segmentSize * 4, w: segmentSize, h: segmentSize, isHead: false },
            { x: x + w / 2 + segmentSize * 1.5, y: y + segmentSize * 4, w: segmentSize, h: segmentSize, isHead: false },
        ];
        
        snakeSegments.forEach((seg, index) => {
            if (seg.isHead) {
                ctx.fillStyle = '#06d6a0';
                ctx.fillRect(seg.x, seg.y, seg.w, seg.h);
                
                ctx.fillStyle = '#fff';
                ctx.fillRect(seg.x + 1, seg.y + 2, 2, 2);
                ctx.fillRect(seg.x + 5, seg.y + 2, 2, 2);
            } else {
                ctx.fillStyle = '#118ab2';
                ctx.fillRect(seg.x, seg.y, seg.w, seg.h);
            }
        });
        
        ctx.fillStyle = '#ff6b6b';
        const flameOffset1 = Math.random() * 8;
        const flameOffset2 = Math.random() * 8;
        
        ctx.beginPath();
        ctx.moveTo(x + w / 2 - segmentSize * 2, y + h);
        ctx.lineTo(x + w / 2 - segmentSize * 1.5, y + h + 10 + flameOffset1);
        ctx.lineTo(x + w / 2 - segmentSize, y + h);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(x + w / 2 + segmentSize / 2, y + h);
        ctx.lineTo(x + w / 2 + segmentSize, y + h + 10 + flameOffset2);
        ctx.lineTo(x + w / 2 + segmentSize * 1.5, y + h);
        ctx.closePath();
        ctx.fill();
    }
    
    renderEnemy(ctx, enemy) {
        const x = enemy.x;
        const y = enemy.y;
        
        if (enemy.type === 'ufo') {
            ctx.fillStyle = '#9b5de5';
            ctx.beginPath();
            ctx.ellipse(x + enemy.width / 2, y + enemy.height / 2 + 5, enemy.width / 2, enemy.height / 4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#f15bb5';
            ctx.beginPath();
            ctx.ellipse(x + enemy.width / 2, y + enemy.height / 3, enemy.width / 4, enemy.height / 4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(x + enemy.width / 2, y + enemy.height / 2 + 5, enemy.width / 2, enemy.height / 4, 0, 0, Math.PI * 2);
            ctx.stroke();
            
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = i === 1 ? '#fee440' : '#00f5d4';
                ctx.beginPath();
                ctx.arc(x + 10 + i * 15, y + enemy.height / 2 + 10, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            ctx.fillStyle = '#e63946';
            ctx.beginPath();
            ctx.moveTo(x + enemy.width / 2, y);
            ctx.lineTo(x + enemy.width, y + enemy.height);
            ctx.lineTo(x, y + enemy.height);
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = '#f1faee';
            ctx.fillRect(x - 10, y + enemy.height / 2, enemy.width + 20, 10);
            ctx.strokeRect(x - 10, y + enemy.height / 2, enemy.width + 20, 10);
            
            ctx.fillStyle = '#1d3557';
            ctx.beginPath();
            ctx.arc(x + enemy.width / 2, y + enemy.height / 3, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }
    
    renderBoss(ctx) {
        const x = this.boss.x;
        const y = this.boss.y;
        
        ctx.fillStyle = '#ff006e';
        ctx.beginPath();
        ctx.ellipse(x + this.boss.width / 2, y + this.boss.height / 2 + 15, this.boss.width / 2, this.boss.height / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        ctx.fillStyle = '#8338ec';
        ctx.beginPath();
        ctx.ellipse(x + this.boss.width / 2, y + this.boss.height / 3, this.boss.width / 3, this.boss.height / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#ffbe0b';
        ctx.beginPath();
        ctx.arc(x + this.boss.width / 2 - 20, y + this.boss.height / 3 - 10, 12, 0, Math.PI * 2);
        ctx.arc(x + this.boss.width / 2 + 20, y + this.boss.height / 3 - 10, 12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fb5607';
        const eyeOffset = Math.sin(Date.now() / 300) * 3;
        ctx.beginPath();
        ctx.arc(x + this.boss.width / 2 - 20 + eyeOffset, y + this.boss.height / 3 - 10, 6, 0, Math.PI * 2);
        ctx.arc(x + this.boss.width / 2 + 20 + eyeOffset, y + this.boss.height / 3 - 10, 6, 0, Math.PI * 2);
        ctx.fill();
        
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#3a86ff' : '#ff006e';
            ctx.beginPath();
            ctx.arc(x + 20 + i * 30, y + this.boss.height / 2 + 20, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.fillStyle = '#333';
        ctx.fillRect(x - 10, y - 30, this.boss.width + 20, 15);
        
        const healthPercent = this.boss.health / this.boss.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#06d6a0' : healthPercent > 0.25 ? '#ffd700' : '#e94560';
        ctx.fillRect(x - 10, y - 30, (this.boss.width + 20) * healthPercent, 15);
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 10, y - 30, this.boss.width + 20, 15);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Courier New';
        ctx.fillText('BOSS', x + this.boss.width / 2 - 25, y - 35);
    }
    
    renderApple(ctx) {
        RenderUtils.drawGlowingApple(ctx, this.apple.x, this.apple.y, this.apple.width, this.apple.height, this.apple.glow, true);
    }
    
    renderExitDoor(ctx) {
        RenderUtils.drawExitDoor(ctx, this.exitDoor.x, this.exitDoor.y, this.exitDoor.width, this.exitDoor.height, 'EXIT ↑');
    }
    
    renderComicBubble(ctx, bubble) {
        const opacity = bubble.life / bubble.maxLife;
        ctx.globalAlpha = opacity;
        
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        
        ctx.font = 'bold 24px Impact';
        const textWidth = ctx.measureText(bubble.text).width;
        
        const bubbleX = bubble.x;
        const bubbleY = bubble.y;
        const bubbleWidth = textWidth + 30;
        const bubbleHeight = 40;
        
        ctx.beginPath();
        ctx.ellipse(bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2, 
                    bubbleWidth / 2, bubbleHeight / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight);
        ctx.lineTo(bubbleX + bubbleWidth / 2 - 10, bubbleY + bubbleHeight + 15);
        ctx.lineTo(bubbleX + bubbleWidth / 2 + 10, bubbleY + bubbleHeight + 15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#000';
        ctx.fillText(bubble.text, bubbleX + 15, bubbleY + 28);
        
        ctx.globalAlpha = 1.0;
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
            ctx.fillText('向上进入出口！', GAME_CONFIG.CANVAS_WIDTH / 2 - 60, 30);
        }
    }
}

window.SpaceshipRoom = SpaceshipRoom;
