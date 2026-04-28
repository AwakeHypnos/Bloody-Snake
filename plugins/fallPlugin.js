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
        this.safePlatform = null;
        this.apple = null;
        this.appleCollected = false;
        
        this.totalPlatformsNeeded = 25;
        this.platformsPassed = 0;
        this.minPlatformWidth = 60;
        this.maxPlatformWidth = 120;
        this.platformVerticalSpacing = 70;
        
        this.scrollSpeed = 1.0;
        this.isScrolling = true;
        
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
    
    createSafePlatformAndApple() {
        this.isScrolling = false;
        
        const safePlatformY = GAME_CONFIG.CANVAS_HEIGHT - 80;
        this.safePlatform = {
            x: 0,
            y: safePlatformY,
            width: GAME_CONFIG.CANVAS_WIDTH,
            height: 20,
            isSafe: true
        };
        
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
        
        if (this.isScrolling && !this.appleCollected) {
            for (const platform of this.platforms) {
                platform.y -= this.scrollSpeed;
            }
            
            this.player.y -= this.scrollSpeed;
        }
        
        this.player.onGround = false;
        
        if (this.safePlatform) {
            if (CollisionUtils.checkPlatformCollision(this.player, this.safePlatform)) {
                if (this.player.vy > 0) {
                    this.player.y = this.safePlatform.y - this.player.height;
                    this.player.vy = 0;
                    this.player.onGround = true;
                }
            }
        }
        
        for (const platform of this.platforms) {
            if (CollisionUtils.checkPlatformCollision(this.player, platform)) {
                if (this.player.vy > 0) {
                    this.player.y = platform.y - this.player.height;
                    this.player.vy = 0;
                    this.player.onGround = true;
                    
                    if (!platform.passed && !platform.isStart && this.isScrolling) {
                        platform.passed = true;
                        this.platformsPassed++;
                    }
                }
            }
        }
        
        if (this.isScrolling && !this.appleCollected) {
            const bottomPlatform = this.platforms.reduce((max, p) => 
                p.y > (max?.y || -Infinity) ? p : max, null);
            
            if (bottomPlatform && bottomPlatform.y < GAME_CONFIG.CANVAS_HEIGHT + 100) {
                const newPlatform = this.generatePlatformAt(
                    bottomPlatform.y + this.platformVerticalSpacing
                );
                this.platforms.push(newPlatform);
            }
            
            this.platforms = this.platforms.filter(platform => {
                return platform.y + platform.height > -50;
            });
            
            if (this.platformsPassed >= this.totalPlatformsNeeded && !this.safePlatform) {
                this.createSafePlatformAndApple();
            }
        }
        
        if (this.player.y + this.player.height < -50) {
            this.handleDeath();
        }
        
        if (this.player.y > GAME_CONFIG.CANVAS_HEIGHT + 100) {
            this.handleDeath();
        }
        
        if (this.apple && CollisionUtils.checkRectCollision(this.player, this.apple)) {
            this.appleCollected = true;
            this.apple = null;
            this.roomComplete();
        }
        
        if (this.apple) {
            this.apple.glow = (this.apple.glow + deltaTime / 200) % (Math.PI * 2);
        }
    }
    
    handleDeath() {
        this.game.data.takeDamage();
        
        if (this.game.data.getHealth() <= 0) {
            return;
        }
        
        this.isRespawning = true;
        
        let respawnPlatform = this.findLowestPlatform();
        
        if (!respawnPlatform) {
            respawnPlatform = {
                x: GAME_CONFIG.CANVAS_WIDTH / 2 - 60,
                y: GAME_CONFIG.CANVAS_HEIGHT - 100,
                width: 120,
                height: 15
            };
        }
        
        setTimeout(() => {
            this.player.x = respawnPlatform.x + respawnPlatform.width / 2 - this.player.width / 2;
            this.player.y = respawnPlatform.y - this.player.height;
            this.player.vx = 0;
            this.player.vy = 0;
            this.player.onGround = true;
            this.player.isJumping = false;
            this.isRespawning = false;
        }, 500);
    }
    
    findLowestPlatform() {
        let lowestPlatform = null;
        let lowestY = -Infinity;
        
        for (const platform of this.platforms) {
            if (platform.y > 0 && platform.y < GAME_CONFIG.CANVAS_HEIGHT) {
                if (platform.y > lowestY) {
                    lowestY = platform.y;
                    lowestPlatform = platform;
                }
            }
        }
        
        if (this.safePlatform && this.safePlatform.y > lowestY) {
            lowestPlatform = this.safePlatform;
        }
        
        return lowestPlatform;
    }
    
    render(ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        if (!this.appleCollected) {
            ctx.strokeStyle = 'rgba(100, 100, 150, 0.1)';
            ctx.lineWidth = 1;
            
            for (let y = 0; y < GAME_CONFIG.CANVAS_HEIGHT + 100; y += 50) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH, y);
                ctx.stroke();
            }
        }
        
        for (const platform of this.platforms) {
            this.renderPlatform(ctx, platform, platform.isStart);
        }
        
        if (this.safePlatform) {
            this.renderPlatform(ctx, this.safePlatform, true);
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
            if (this.platformsPassed >= this.totalPlatformsNeeded) {
                ctx.fillStyle = '#06d6a0';
                ctx.fillText('落到安全平台收集金苹果！', GAME_CONFIG.CANVAS_WIDTH / 2 - 90, 30);
            } else {
                const remaining = Math.max(0, this.totalPlatformsNeeded - this.platformsPassed);
                ctx.fillText(`剩余层数: ${remaining}`, GAME_CONFIG.CANVAS_WIDTH / 2 - 50, 30);
                ctx.fillText('控制蛇向下移动踩平台！', GAME_CONFIG.CANVAS_WIDTH / 2 - 80, 55);
            }
        }
    }
}

window.FallRoom = FallRoom;
