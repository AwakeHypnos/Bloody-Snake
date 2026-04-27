class FallRoom extends BaseRoomPlugin {
    constructor(game) {
        super(game);
        this.roomType = ROOM_TYPES.FALL;
        
        this.player = {
            x: GAME_CONFIG.CANVAS_WIDTH / 2 - 20,
            y: 200,
            width: 40,
            height: 60,
            vx: 0,
            vy: 0,
            speed: 3,
            gravity: 0.4,
            onGround: false,
            isJumping: false
        };
        
        this.platforms = [];
        this.safePlatforms = [];
        this.apple = null;
        this.appleCollected = false;
        
        this.totalPlatformsNeeded = 25;
        this.platformsPassed = 0;
        this.minPlatformWidth = 60;
        this.maxPlatformWidth = 120;
        this.platformVerticalSpacing = 70;
        
        this.scrollSpeed = 1.0;
        
        this.respawnPlatform = null;
        this.isRespawning = false;
        this.startPlatform = null;
        
        this.generateInitialPlatforms();
    }
    
    generateInitialPlatforms() {
        this.platforms = [];
        
        this.startPlatform = {
            x: GAME_CONFIG.CANVAS_WIDTH / 2 - 80,
            y: 260,
            width: 160,
            height: 15,
            isStart: true
        };
        this.platforms.push(this.startPlatform);
        this.respawnPlatform = this.startPlatform;
        
        let lastY = this.startPlatform.y + this.platformVerticalSpacing;
        const platformCount = Math.ceil(GAME_CONFIG.CANVAS_HEIGHT / this.platformVerticalSpacing) + 3;
        
        for (let i = 0; i < platformCount; i++) {
            const width = this.minPlatformWidth + Math.random() * (this.maxPlatformWidth - this.minPlatformWidth);
            const x = Math.random() * (GAME_CONFIG.CANVAS_WIDTH - width);
            
            this.platforms.push({
                x: x,
                y: lastY,
                width: width,
                height: 15,
                passed: false
            });
            
            lastY += this.platformVerticalSpacing;
        }
    }
    
    generatePlatformAt(y) {
        const width = this.minPlatformWidth + Math.random() * (this.maxPlatformWidth - this.minPlatformWidth);
        const x = Math.random() * (GAME_CONFIG.CANVAS_WIDTH - width);
        
        return {
            x: x,
            y: y,
            width: width,
            height: 15,
            passed: false
        };
    }
    
    generateSafePlatforms() {
        this.safePlatforms = [];
        
        const safePlatformY = GAME_CONFIG.CANVAS_HEIGHT - 80;
        this.safePlatforms.push({
            x: 0,
            y: safePlatformY,
            width: GAME_CONFIG.CANVAS_WIDTH,
            height: 20
        });
        
        this.apple = {
            x: GAME_CONFIG.CANVAS_WIDTH / 2 - 20,
            y: safePlatformY - 50,
            width: 40,
            height: 40,
            glow: 0
        };
    }
    
    handleInput() {
        if (this.game.keys['ArrowLeft']) {
            this.player.vx = -this.player.speed;
        } else if (this.game.keys['ArrowRight']) {
            this.player.vx = this.player.speed;
        } else {
            this.player.vx *= 0.8;
            if (Math.abs(this.player.vx) < 0.1) {
                this.player.vx = 0;
            }
        }
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        this.handleInput();
        
        if (this.isRespawning) {
            return;
        }
        
        if (!this.appleCollected) {
            this.player.vy += this.player.gravity;
            
            this.player.x += this.player.vx;
            this.player.y += this.player.vy;
            
            if (this.player.x < 0) {
                this.player.x = 0;
                this.player.vx = 0;
            }
            if (this.player.x > GAME_CONFIG.CANVAS_WIDTH - this.player.width) {
                this.player.x = GAME_CONFIG.CANVAS_WIDTH - this.player.width;
                this.player.vx = 0;
            }
            
            for (const platform of this.platforms) {
                platform.y -= this.scrollSpeed;
            }
            
            this.player.onGround = false;
            for (const platform of this.platforms) {
                if (CollisionUtils.checkPlatformCollision(this.player, platform)) {
                    if (this.player.vy > 0) {
                        this.player.y = platform.y - this.player.height;
                        this.player.vy = 0;
                        this.player.onGround = true;
                        this.player.isJumping = false;
                        
                        if (!platform.isStart && !platform.isBottom) {
                            this.respawnPlatform = platform;
                        }
                        
                        if (!platform.passed && !platform.isStart && !platform.isBottom) {
                            platform.passed = true;
                            this.platformsPassed++;
                        }
                    }
                }
            }
            
            const bottomPlatform = this.platforms.reduce((max, p) => 
                (!p.isBottom && p.y > (max?.y || -Infinity)) ? p : max, null);
            
            if (bottomPlatform && bottomPlatform.y < GAME_CONFIG.CANVAS_HEIGHT + 100) {
                const newPlatform = this.generatePlatformAt(
                    bottomPlatform.y + this.platformVerticalSpacing
                );
                this.platforms.push(newPlatform);
            }
            
            this.platforms = this.platforms.filter(platform => {
                return platform.y + platform.height > -50;
            });
            
            if (this.platformsPassed >= this.totalPlatformsNeeded && !this.apple) {
                const existingBottom = this.platforms.find(p => p.isBottom);
                if (!existingBottom) {
                    const bottomPlatform = {
                        x: 0,
                        y: GAME_CONFIG.CANVAS_HEIGHT - 50,
                        width: GAME_CONFIG.CANVAS_WIDTH,
                        height: 20,
                        isBottom: true
                    };
                    this.platforms.push(bottomPlatform);
                    
                    this.apple = {
                        x: GAME_CONFIG.CANVAS_WIDTH / 2 - 20,
                        y: bottomPlatform.y - 50,
                        width: 40,
                        height: 40,
                        glow: 0
                    };
                }
            }
            
            if (this.player.y + this.player.height < -20) {
                this.handleHitTop();
            }
            
            if (this.player.y > GAME_CONFIG.CANVAS_HEIGHT + 50) {
                this.handleFallOff();
            }
            
            if (this.apple && CollisionUtils.checkRectCollision(this.player, this.apple)) {
                this.appleCollected = true;
                this.apple = null;
                this.platforms = [];
                this.generateSafePlatforms();
            }
        } else {
            this.player.vy += this.player.gravity * 0.5;
            this.player.x += this.player.vx;
            this.player.y += this.player.vy;
            
            if (this.player.x < 0) {
                this.player.x = 0;
            }
            if (this.player.x > GAME_CONFIG.CANVAS_WIDTH - this.player.width) {
                this.player.x = GAME_CONFIG.CANVAS_WIDTH - this.player.width;
            }
            
            for (const platform of this.safePlatforms) {
                if (CollisionUtils.checkPlatformCollision(this.player, platform)) {
                    if (this.player.vy > 0) {
                        this.player.y = platform.y - this.player.height;
                        this.player.vy = 0;
                        this.player.onGround = true;
                    }
                }
            }
            
            if (this.player.y > GAME_CONFIG.CANVAS_HEIGHT + 100) {
                this.game.data.takeDamage();
                if (this.game.data.getHealth() > 0) {
                    this.player.x = GAME_CONFIG.CANVAS_WIDTH / 2 - 20;
                    this.player.y = GAME_CONFIG.CANVAS_HEIGHT - 200;
                    this.player.vx = 0;
                    this.player.vy = 0;
                }
            }
        }
        
        if (this.apple) {
            this.apple.glow = (this.apple.glow + deltaTime / 200) % (Math.PI * 2);
        }
    }
    
    handleHitTop() {
        this.game.data.takeDamage();
        
        if (this.game.data.getHealth() <= 0) {
            return;
        }
        
        this.isRespawning = true;
        
        let respawnTarget = this.respawnPlatform || this.startPlatform;
        
        setTimeout(() => {
            this.player.x = respawnTarget.x + respawnTarget.width / 2 - this.player.width / 2;
            this.player.y = respawnTarget.y - this.player.height;
            this.player.vx = 0;
            this.player.vy = 0;
            this.player.onGround = true;
            this.player.isJumping = false;
            this.isRespawning = false;
        }, 500);
    }
    
    handleFallOff() {
        this.game.data.takeDamage();
        
        if (this.game.data.getHealth() <= 0) {
            return;
        }
        
        this.isRespawning = true;
        
        let respawnTarget = this.respawnPlatform || this.startPlatform;
        
        setTimeout(() => {
            this.player.x = respawnTarget.x + respawnTarget.width / 2 - this.player.width / 2;
            this.player.y = respawnTarget.y - this.player.height;
            this.player.vx = 0;
            this.player.vy = 0;
            this.player.onGround = true;
            this.player.isJumping = false;
            this.isRespawning = false;
        }, 500);
    }
    
    render(ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        if (this.appleCollected) {
            for (const platform of this.safePlatforms) {
                this.renderPlatform(ctx, platform, true);
            }
        } else {
            const gridY = Math.floor(this.scrollSpeed * 10 / 50) * 50;
            ctx.strokeStyle = 'rgba(100, 100, 150, 0.1)';
            ctx.lineWidth = 1;
            
            for (let y = gridY - 50; y < GAME_CONFIG.CANVAS_HEIGHT + 100; y += 50) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH, y);
                ctx.stroke();
            }
            
            for (const platform of this.platforms) {
                this.renderPlatform(ctx, platform, platform.isStart || platform.isBottom);
            }
        }
        
        if (this.apple) {
            this.renderApple(ctx);
        }
        
        if (this.shouldRenderPlayer() && !this.isRespawning) {
            this.renderPlayer(ctx);
        }
        
        this.renderHUD(ctx);
    }
    
    renderPlatform(ctx, platform, isSpecial) {
        const gradient = ctx.createLinearGradient(platform.x, platform.y, platform.x, platform.y + platform.height);
        if (isSpecial) {
            gradient.addColorStop(0, '#ffd700');
            gradient.addColorStop(1, '#ff8c00');
        } else {
            gradient.addColorStop(0, '#4cc9f0');
            gradient.addColorStop(1, '#0077b6');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
        
        if (isSpecial) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(platform.x + 5, platform.y + 2, platform.width - 10, 3);
        }
    }
    
    renderPlayer(ctx) {
        const x = this.player.x;
        const y = this.player.y;
        
        const springSegments = [
            { x: x + 15, y: y, w: 10, h: 10, isHead: true },
            { x: x + 5, y: y + 10, w: 30, h: 8, isHead: false },
            { x: x + 10, y: y + 18, w: 20, h: 8, isHead: false },
            { x: x + 5, y: y + 26, w: 30, h: 8, isHead: false },
            { x: x + 10, y: y + 34, w: 20, h: 8, isHead: false },
            { x: x + 5, y: y + 42, w: 30, h: 8, isHead: false },
            { x: x + 10, y: y + 50, w: 20, h: 8, isHead: false },
        ];
        
        springSegments.forEach((seg, index) => {
            if (seg.isHead) {
                ctx.fillStyle = '#06d6a0';
                ctx.fillRect(seg.x, seg.y, seg.w, seg.h);
                
                ctx.fillStyle = '#fff';
                ctx.fillRect(seg.x + 1, seg.y + 2, 2, 2);
                ctx.fillRect(seg.x + 7, seg.y + 2, 2, 2);
            } else {
                ctx.fillStyle = index % 2 === 0 ? '#118ab2' : '#073b4c';
                ctx.fillRect(seg.x, seg.y, seg.w, seg.h);
            }
        });
        
        if (this.player.vy > 0) {
            ctx.fillStyle = '#ff6b6b';
            const flameHeight = Math.min(Math.abs(this.player.vy) * 0.5, 10);
            
            ctx.beginPath();
            ctx.moveTo(x + 10, y);
            ctx.lineTo(x + 15, y - flameHeight - Math.random() * 3);
            ctx.lineTo(x + 20, y);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(x + 20, y);
            ctx.lineTo(x + 25, y - flameHeight * 0.7 - Math.random() * 3);
            ctx.lineTo(x + 30, y);
            ctx.closePath();
            ctx.fill();
        }
    }
    
    renderApple(ctx) {
        RenderUtils.drawGlowingApple(ctx, this.apple.x, this.apple.y, this.apple.width, this.apple.height, this.apple.glow, true);
    }
    
    renderHUD(ctx) {
        ctx.fillStyle = '#fff';
        ctx.font = '16px Courier New';
        
        if (!this.appleCollected) {
            const remaining = Math.max(0, this.totalPlatformsNeeded - this.platformsPassed);
            ctx.fillText(`剩余层数: ${remaining}`, GAME_CONFIG.CANVAS_WIDTH / 2 - 50, 30);
            ctx.fillText('控制蛇向下移动踩平台！', GAME_CONFIG.CANVAS_WIDTH / 2 - 80, 55);
        } else {
            ctx.fillStyle = '#06d6a0';
            ctx.fillText('收集金苹果！', GAME_CONFIG.CANVAS_WIDTH / 2 - 50, 30);
        }
    }
}

window.FallRoom = FallRoom;
