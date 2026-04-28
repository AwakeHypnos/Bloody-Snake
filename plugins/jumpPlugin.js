class JumpRoom extends BaseRoomPlugin {
    constructor(game) {
        super(game);
        this.roomType = ROOM_TYPES.JUMP;
        
        this.player = {
            x: GAME_CONFIG.CANVAS_WIDTH / 2 - 20,
            y: GAME_CONFIG.CANVAS_HEIGHT - 80,
            width: 40,
            height: 60,
            vx: 0,
            vy: 0,
            speed: 2,
            jumpPower: -14,
            gravity: 0.22,
            onGround: false,
            isJumping: false,
            jumpCooldown: 0,
            jumpCooldownDuration: 500
        };
        
        this.platforms = [];
        this.safePlatforms = [];
        this.apple = null;
        this.appleCollected = false;
        this.exitDoor = null;
        
        this.platformCount = 8;
        this.minPlatformWidth = 80;
        this.maxPlatformWidth = 150;
        
        this.cameraY = 0;
        this.targetCameraY = 0;
        this.maxHeight = 0;
        
        this.respawnPlatformIndex = -1;
        this.isRespawning = false;
        
        this.generatePlatforms();
    }
    
    generatePlatforms() {
        this.platforms = [];
        
        const startPlatform = {
            x: GAME_CONFIG.CANVAS_WIDTH / 2 - 60,
            y: GAME_CONFIG.CANVAS_HEIGHT - 30,
            width: 120,
            height: 15
        };
        this.platforms.push(startPlatform);
        
        const verticalSpacing = 80;
        const horizontalRange = 300;
        
        for (let i = 1; i < this.platformCount; i++) {
            const prevPlatform = this.platforms[i - 1];
            const width = this.minPlatformWidth + Math.random() * (this.maxPlatformWidth - this.minPlatformWidth);
            
            const horizontalOffset = (Math.random() - 0.5) * horizontalRange;
            let x = prevPlatform.x + horizontalOffset;
            
            x = Math.max(20, Math.min(GAME_CONFIG.CANVAS_WIDTH - width - 20, x));
            
            const y = prevPlatform.y - verticalSpacing - Math.random() * 20;
            
            this.platforms.push({
                x: x,
                y: y,
                width: width,
                height: 15
            });
        }
        
        const topPlatform = {
            x: GAME_CONFIG.CANVAS_WIDTH / 2 - 80,
            y: this.platforms[this.platforms.length - 1].y - verticalSpacing,
            width: 160,
            height: 15,
            isTop: true
        };
        this.platforms.push(topPlatform);
        
        this.apple = {
            x: topPlatform.x + topPlatform.width / 2 - 20,
            y: topPlatform.y - 50,
            width: 40,
            height: 40,
            glow: 0
        };
    }
    
    generateSafePlatforms() {
        this.safePlatforms = [];
        
        const safePlatformY = 80;
        this.safePlatforms.push({
            x: 0,
            y: safePlatformY,
            width: GAME_CONFIG.CANVAS_WIDTH,
            height: 20
        });
        
        const exitSide = Math.floor(Math.random() * 3);
        this.exitDoor = {
            width: 60,
            height: 50
        };
        
        switch(exitSide) {
            case 0:
                this.exitDoor.x = 10;
                this.exitDoor.y = safePlatformY - 50;
                break;
            case 1:
                this.exitDoor.x = GAME_CONFIG.CANVAS_WIDTH - 70;
                this.exitDoor.y = safePlatformY - 50;
                break;
            case 2:
                this.exitDoor.x = GAME_CONFIG.CANVAS_WIDTH / 2 - 30;
                this.exitDoor.y = 10;
                break;
        }
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
            
            if (this.player.jumpCooldown > 0) {
                this.player.jumpCooldown -= deltaTime;
            }
            
            if (this.player.onGround && !this.player.isJumping && this.player.jumpCooldown <= 0) {
                this.player.vy = this.player.jumpPower;
                this.player.isJumping = true;
                this.player.onGround = false;
                this.player.jumpCooldown = this.player.jumpCooldownDuration;
            }
            
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
            
            const currentHeight = GAME_CONFIG.CANVAS_HEIGHT - this.player.y;
            if (currentHeight > this.maxHeight) {
                this.maxHeight = currentHeight;
            }
            
            const screenCenterY = GAME_CONFIG.CANVAS_HEIGHT / 2;
            if (this.player.y < screenCenterY + this.cameraY) {
                this.targetCameraY = screenCenterY - this.player.y;
            }
            this.cameraY += (this.targetCameraY - this.cameraY) * 0.1;
            
            this.player.onGround = false;
            this.respawnPlatformIndex = -1;
            for (let i = 0; i < this.platforms.length; i++) {
                const platform = this.platforms[i];
                if (CollisionUtils.checkPlatformCollision(this.player, platform)) {
                    if (this.player.vy > 0) {
                        this.player.y = platform.y - this.player.height;
                        this.player.vy = 0;
                        this.player.onGround = true;
                        this.player.isJumping = false;
                        this.respawnPlatformIndex = i;
                    }
                }
            }
            
            this.platforms = this.platforms.filter(platform => {
                const platformScreenY = platform.y - this.cameraY;
                return platformScreenY < GAME_CONFIG.CANVAS_HEIGHT + 200;
            });
            
            if (this.player.y > GAME_CONFIG.CANVAS_HEIGHT + this.cameraY + 100) {
                this.handleFall();
            }
            
            if (this.apple && CollisionUtils.checkRectCollision(this.player, this.apple)) {
                this.appleCollected = true;
                this.apple = null;
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
            
            if (this.exitDoor && CollisionUtils.checkRectCollision(this.player, this.exitDoor)) {
                this.roomComplete();
            }
        }
        
        if (this.apple) {
            this.apple.glow = (this.apple.glow + deltaTime / 200) % (Math.PI * 2);
        }
    }
    
    handleFall() {
        this.game.data.takeDamage();
        
        if (this.game.data.getHealth() <= 0) {
            return;
        }
        
        this.isRespawning = true;
        
        let respawnPlatform;
        if (this.respawnPlatformIndex >= 0 && this.respawnPlatformIndex < this.platforms.length) {
            respawnPlatform = this.platforms[this.respawnPlatformIndex];
        }
        
        if (!respawnPlatform && this.platforms.length > 0) {
            respawnPlatform = this.platforms.reduce((best, p) => {
                const pScreenY = p.y - this.cameraY;
                if (pScreenY > 0 && pScreenY < GAME_CONFIG.CANVAS_HEIGHT) {
                    if (!best || pScreenY > (best.y - this.cameraY)) {
                        return p;
                    }
                }
                return best;
            }, null);
        }
        
        if (!respawnPlatform && this.platforms.length > 0) {
            respawnPlatform = this.platforms[this.platforms.length - 1];
        }
        
        if (!respawnPlatform) {
            respawnPlatform = {
                x: GAME_CONFIG.CANVAS_WIDTH / 2 - 60,
                y: this.cameraY + GAME_CONFIG.CANVAS_HEIGHT - 30,
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
            this.respawnPlatformIndex = -1;
            this.isRespawning = false;
        }, 500);
    }
    
    render(ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        ctx.save();
        if (!this.appleCollected) {
            ctx.translate(0, this.cameraY);
        }
        
        if (!this.appleCollected) {
            const gridY = Math.floor(this.cameraY / 50) * 50;
            ctx.strokeStyle = 'rgba(100, 100, 150, 0.1)';
            ctx.lineWidth = 1;
            
            for (let y = gridY - 50; y < GAME_CONFIG.CANVAS_HEIGHT + this.cameraY + 100; y += 50) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH, y);
                ctx.stroke();
            }
        }
        
        if (this.appleCollected) {
            for (const platform of this.safePlatforms) {
                this.renderPlatform(ctx, platform, true);
            }
        } else {
            for (const platform of this.platforms) {
                this.renderPlatform(ctx, platform, platform.isTop);
            }
        }
        
        if (this.apple) {
            this.renderApple(ctx);
        }
        
        if (this.exitDoor) {
            this.renderExitDoor(ctx);
        }
        
        if (this.shouldRenderPlayer() && !this.isRespawning) {
            this.renderPlayer(ctx);
        }
        
        ctx.restore();
        
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
        const segmentSize = 10;
        
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
        
        if (this.player.vy < 0) {
            ctx.fillStyle = '#ff6b6b';
            const flameHeight = Math.min(Math.abs(this.player.vy) * 0.8, 15);
            
            ctx.beginPath();
            ctx.moveTo(x + 10, y + this.player.height);
            ctx.lineTo(x + 15, y + this.player.height + flameHeight + Math.random() * 5);
            ctx.lineTo(x + 20, y + this.player.height);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(x + 20, y + this.player.height);
            ctx.lineTo(x + 25, y + this.player.height + flameHeight * 0.7 + Math.random() * 5);
            ctx.lineTo(x + 30, y + this.player.height);
            ctx.closePath();
            ctx.fill();
        }
    }
    
    renderApple(ctx) {
        RenderUtils.drawGlowingApple(ctx, this.apple.x, this.apple.y, this.apple.width, this.apple.height, this.apple.glow, true);
    }
    
    renderExitDoor(ctx) {
        RenderUtils.drawExitDoor(ctx, this.exitDoor.x, this.exitDoor.y, this.exitDoor.width, this.exitDoor.height, 'EXIT');
    }
    
    renderHUD(ctx) {
        ctx.fillStyle = '#fff';
        ctx.font = '16px Courier New';
        
        if (!this.appleCollected) {
            const heightMeters = Math.floor(this.maxHeight / 10);
            ctx.fillText(`高度: ${heightMeters}m`, GAME_CONFIG.CANVAS_WIDTH / 2 - 40, 30);
            ctx.fillText('跳上平台向上攀登！', GAME_CONFIG.CANVAS_WIDTH / 2 - 70, 55);
        } else if (this.exitDoor) {
            ctx.fillStyle = '#06d6a0';
            ctx.fillText('找到出口离开房间！', GAME_CONFIG.CANVAS_WIDTH / 2 - 70, 30);
        }
    }
}

window.JumpRoom = JumpRoom;
