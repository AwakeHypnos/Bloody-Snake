const BUBBLE_COLORS = [
    '#ff6b6b',
    '#4cc9f0',
    '#ffd700',
    '#7b2cbf',
    '#06d6a0'
];

const BUBBLE_RADIUS = 20;
const BUBBLE_GRID_COLS = 16;
const BUBBLE_GRID_ROWS = 8;

class BubbleRoom extends BaseRoomPlugin {
    constructor(game) {
        super(game);
        this.roomType = ROOM_TYPES.BUBBLE;
        
        this.player = {
            x: GAME_CONFIG.CANVAS_WIDTH / 2,
            y: GAME_CONFIG.CANVAS_HEIGHT - 80,
            width: 50,
            height: 60,
            speed: 4,
            angle: -Math.PI / 2,
            currentBubble: null,
            nextBubble: null
        };
        
        this.bubbleGrid = [];
        this.flyingBubble = null;
        this.fallingBubbles = [];
        
        this.apple = null;
        this.appleCollected = false;
        this.appleFalling = false;
        this.appleFallingSpeed = 3;
        
        this.exitDoor = null;
        
        this.shootCooldown = 0;
        this.shootCooldownDuration = 300;
        
        this.phase = 'playing';
        
        this.initGrid();
        this.initBubbles();
    }
    
    initGrid() {
        this.bubbleGrid = [];
        for (let row = 0; row < BUBBLE_GRID_ROWS; row++) {
            this.bubbleGrid[row] = [];
            for (let col = 0; col < BUBBLE_GRID_COLS; col++) {
                this.bubbleGrid[row][col] = null;
            }
        }
    }
    
    initBubbles() {
        const startY = 50;
        
        for (let row = 0; row < BUBBLE_GRID_ROWS; row++) {
            const isOddRow = row % 2 === 1;
            const colsForRow = isOddRow ? BUBBLE_GRID_COLS - 1 : BUBBLE_GRID_COLS;
            
            for (let col = 0; col < colsForRow; col++) {
                if (Math.random() > 0.3) {
                    const colorIndex = Math.floor(Math.random() * BUBBLE_COLORS.length);
                    const bubbleX = isOddRow 
                        ? (col + 1) * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS
                        : col * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS;
                    const bubbleY = startY + row * (BUBBLE_RADIUS * 2 * 0.85);
                    
                    this.bubbleGrid[row][col] = {
                        x: bubbleX,
                        y: bubbleY,
                        radius: BUBBLE_RADIUS,
                        color: BUBBLE_COLORS[colorIndex],
                        row: row,
                        col: col,
                        isOddRow: isOddRow,
                        connectedToTop: false
                    };
                }
            }
        }
        
        this.player.currentBubble = this.createRandomBubble();
        this.player.nextBubble = this.createRandomBubble();
    }
    
    createRandomBubble() {
        const colorIndex = Math.floor(Math.random() * BUBBLE_COLORS.length);
        return {
            x: this.player.x,
            y: this.player.y - 40,
            radius: BUBBLE_RADIUS,
            color: BUBBLE_COLORS[colorIndex],
            vx: 0,
            vy: 0,
            speed: 8
        };
    }
    
    handleInput() {
        if (this.game.keys['ArrowLeft']) {
            this.player.angle -= 0.03;
            this.player.angle = Math.max(-Math.PI + 0.2, this.player.angle);
        }
        if (this.game.keys['ArrowRight']) {
            this.player.angle += 0.03;
            this.player.angle = Math.min(-0.2, this.player.angle);
        }
        
        if (this.game.keys[' '] && !this.flyingBubble && this.shootCooldown <= 0) {
            this.game.keys[' '] = false;
            this.shoot();
        }
    }
    
    shoot() {
        if (!this.player.currentBubble) return;
        
        this.flyingBubble = {
            x: this.player.x + Math.cos(this.player.angle) * 40,
            y: this.player.y - 30 + Math.sin(this.player.angle) * 40,
            radius: BUBBLE_RADIUS,
            color: this.player.currentBubble.color,
            vx: Math.cos(this.player.angle) * 10,
            vy: Math.sin(this.player.angle) * 10
        };
        
        this.player.currentBubble = this.player.nextBubble;
        this.player.nextBubble = this.createRandomBubble();
        this.shootCooldown = this.shootCooldownDuration;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        if (this.phase !== 'playing') return;
        
        this.handleInput();
        
        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime;
        }
        
        if (this.flyingBubble) {
            this.updateFlyingBubble();
        }
        
        this.updateFallingBubbles(deltaTime);
        
        if (this.appleFalling && this.apple) {
            this.apple.y += this.appleFallingSpeed;
            this.checkAppleCollection();
        }
    }
    
    updateFlyingBubble() {
        this.flyingBubble.x += this.flyingBubble.vx;
        this.flyingBubble.y += this.flyingBubble.vy;
        
        if (this.flyingBubble.x - this.flyingBubble.radius < 0) {
            this.flyingBubble.x = this.flyingBubble.radius;
            this.flyingBubble.vx *= -1;
        }
        if (this.flyingBubble.x + this.flyingBubble.radius > GAME_CONFIG.CANVAS_WIDTH) {
            this.flyingBubble.x = GAME_CONFIG.CANVAS_WIDTH - this.flyingBubble.radius;
            this.flyingBubble.vx *= -1;
        }
        
        if (this.flyingBubble.y - this.flyingBubble.radius < 0) {
            this.attachBubbleToGrid();
            return;
        }
        
        for (let row = 0; row < BUBBLE_GRID_ROWS; row++) {
            for (let col = 0; col < BUBBLE_GRID_COLS; col++) {
                const gridBubble = this.bubbleGrid[row][col];
                if (gridBubble) {
                    const dx = this.flyingBubble.x - gridBubble.x;
                    const dy = this.flyingBubble.y - gridBubble.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < this.flyingBubble.radius + gridBubble.radius) {
                        this.attachBubbleToGrid(gridBubble);
                        return;
                    }
                }
            }
        }
        
        if (this.flyingBubble.y > GAME_CONFIG.CANVAS_HEIGHT + 50) {
            this.flyingBubble = null;
        }
    }
    
    attachBubbleToGrid(nearestBubble = null) {
        if (!this.flyingBubble) return;
        
        let targetRow, targetCol;
        let isOddRow;
        
        if (nearestBubble) {
            const dx = this.flyingBubble.x - nearestBubble.x;
            const dy = this.flyingBubble.y - nearestBubble.y;
            
            let bestRow = nearestBubble.row;
            let bestCol = nearestBubble.col;
            let bestDist = Infinity;
            
            const neighbors = this.getNeighbors(nearestBubble.row, nearestBubble.col, nearestBubble.isOddRow);
            neighbors.push({ row: nearestBubble.row + 1, col: nearestBubble.col, isOddRow: !nearestBubble.isOddRow });
            neighbors.push({ row: nearestBubble.row + 1, col: nearestBubble.col - 1, isOddRow: !nearestBubble.isOddRow });
            
            for (const pos of neighbors) {
                if (pos.row >= 0 && pos.row < BUBBLE_GRID_ROWS && 
                    pos.col >= 0 && pos.col < BUBBLE_GRID_COLS &&
                    !this.bubbleGrid[pos.row][pos.col]) {
                    
                    const posX = pos.isOddRow 
                        ? (pos.col + 1) * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS
                        : pos.col * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS;
                    const posY = 50 + pos.row * (BUBBLE_RADIUS * 2 * 0.85);
                    
                    const dist = MathUtils.distance(this.flyingBubble.x, this.flyingBubble.y, posX, posY);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestRow = pos.row;
                        bestCol = pos.col;
                        isOddRow = pos.isOddRow;
                    }
                }
            }
            
            targetRow = bestRow;
            targetCol = bestCol;
        } else {
            targetRow = 0;
            targetCol = Math.floor(this.flyingBubble.x / (BUBBLE_RADIUS * 2));
            targetCol = Math.max(0, Math.min(BUBBLE_GRID_COLS - 1, targetCol));
            isOddRow = false;
            
            while (targetRow < BUBBLE_GRID_ROWS && this.bubbleGrid[targetRow][targetCol]) {
                targetRow++;
                isOddRow = !isOddRow;
            }
        }
        
        if (targetRow >= BUBBLE_GRID_ROWS) {
            this.flyingBubble = null;
            return;
        }
        
        const bubbleX = isOddRow 
            ? (targetCol + 1) * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS
            : targetCol * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS;
        const bubbleY = 50 + targetRow * (BUBBLE_RADIUS * 2 * 0.85);
        
        this.bubbleGrid[targetRow][targetCol] = {
            x: bubbleX,
            y: bubbleY,
            radius: BUBBLE_RADIUS,
            color: this.flyingBubble.color,
            row: targetRow,
            col: targetCol,
            isOddRow: isOddRow,
            connectedToTop: false
        };
        
        this.flyingBubble = null;
        
        this.checkMatches(targetRow, targetCol);
    }
    
    getNeighbors(row, col, isOddRow) {
        const neighbors = [];
        if (isOddRow) {
            neighbors.push({ row: row, col: col - 1, isOddRow: true });
            neighbors.push({ row: row, col: col + 1, isOddRow: true });
            neighbors.push({ row: row - 1, col: col - 1, isOddRow: false });
            neighbors.push({ row: row - 1, col: col, isOddRow: false });
            neighbors.push({ row: row + 1, col: col - 1, isOddRow: false });
            neighbors.push({ row: row + 1, col: col, isOddRow: false });
        } else {
            neighbors.push({ row: row, col: col - 1, isOddRow: false });
            neighbors.push({ row: row, col: col + 1, isOddRow: false });
            neighbors.push({ row: row - 1, col: col, isOddRow: true });
            neighbors.push({ row: row - 1, col: col + 1, isOddRow: true });
            neighbors.push({ row: row + 1, col: col, isOddRow: true });
            neighbors.push({ row: row + 1, col: col + 1, isOddRow: true });
        }
        return neighbors.filter(n => 
            n.row >= 0 && n.row < BUBBLE_GRID_ROWS && 
            n.col >= 0 && n.col < BUBBLE_GRID_COLS
        );
    }
    
    checkMatches(startRow, startCol) {
        const startBubble = this.bubbleGrid[startRow][startCol];
        if (!startBubble) return;
        
        const color = startBubble.color;
        const matches = [];
        const visited = new Set();
        const queue = [{ row: startRow, col: startCol }];
        
        while (queue.length > 0) {
            const { row, col } = queue.shift();
            const key = `${row},${col}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            const bubble = this.bubbleGrid[row][col];
            if (!bubble || bubble.color !== color) continue;
            
            matches.push({ row, col });
            
            const neighbors = this.getNeighbors(row, col, bubble.isOddRow);
            for (const n of neighbors) {
                const nKey = `${n.row},${n.col}`;
                if (!visited.has(nKey)) {
                    const nBubble = this.bubbleGrid[n.row][n.col];
                    if (nBubble && nBubble.color === color) {
                        queue.push(n);
                    }
                }
            }
        }
        
        if (matches.length >= 3) {
            for (const { row, col } of matches) {
                this.bubbleGrid[row][col] = null;
            }
            
            this.checkFloatingBubbles();
        }
    }
    
    checkFloatingBubbles() {
        for (let row = 0; row < BUBBLE_GRID_ROWS; row++) {
            for (let col = 0; col < BUBBLE_GRID_COLS; col++) {
                const bubble = this.bubbleGrid[row][col];
                if (bubble) {
                    bubble.connectedToTop = false;
                }
            }
        }
        
        const visited = new Set();
        const queue = [];
        
        for (let col = 0; col < BUBBLE_GRID_COLS; col++) {
            const bubble = this.bubbleGrid[0][col];
            if (bubble) {
                queue.push({ row: 0, col });
                bubble.connectedToTop = true;
            }
        }
        
        while (queue.length > 0) {
            const { row, col } = queue.shift();
            const key = `${row},${col}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            const bubble = this.bubbleGrid[row][col];
            if (!bubble) continue;
            
            const neighbors = this.getNeighbors(row, col, bubble.isOddRow);
            for (const n of neighbors) {
                const nKey = `${n.row},${n.col}`;
                if (!visited.has(nKey)) {
                    const nBubble = this.bubbleGrid[n.row][n.col];
                    if (nBubble) {
                        nBubble.connectedToTop = true;
                        queue.push(n);
                    }
                }
            }
        }
        
        for (let row = 0; row < BUBBLE_GRID_ROWS; row++) {
            for (let col = 0; col < BUBBLE_GRID_COLS; col++) {
                const bubble = this.bubbleGrid[row][col];
                if (bubble && !bubble.connectedToTop) {
                    this.fallingBubbles.push({
                        x: bubble.x,
                        y: bubble.y,
                        radius: bubble.radius,
                        color: bubble.color,
                        vy: 0,
                        gravity: 0.3
                    });
                    this.bubbleGrid[row][col] = null;
                }
            }
        }
        
        this.checkAppleStatus();
    }
    
    checkAppleStatus() {
        let hasSupportingBubbles = false;
        
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < BUBBLE_GRID_COLS; col++) {
                if (this.bubbleGrid[row][col]) {
                    hasSupportingBubbles = true;
                    break;
                }
            }
            if (hasSupportingBubbles) break;
        }
        
        if (!hasSupportingBubbles && !this.appleFalling && !this.appleCollected) {
            this.spawnApple();
            this.appleFalling = true;
        }
    }
    
    spawnApple() {
        this.apple = {
            x: GAME_CONFIG.CANVAS_WIDTH / 2 - 20,
            y: 50,
            width: 40,
            height: 40,
            glow: 0
        };
    }
    
    updateFallingBubbles(deltaTime) {
        this.fallingBubbles = this.fallingBubbles.filter(bubble => {
            bubble.vy += bubble.gravity;
            bubble.y += bubble.vy;
            return bubble.y < GAME_CONFIG.CANVAS_HEIGHT + 50;
        });
    }
    
    checkAppleCollection() {
        if (!this.apple) return;
        
        const appleCenterX = this.apple.x + this.apple.width / 2;
        const appleCenterY = this.apple.y + this.apple.height / 2;
        
        const playerDist = MathUtils.distance(
            appleCenterX, appleCenterY,
            this.player.x, this.player.y
        );
        
        if (playerDist < this.apple.width / 2 + 30) {
            this.appleCollected = true;
            this.apple = null;
            this.appleFalling = false;
            this.spawnExitDoor();
        }
        
        if (this.apple && this.apple.y > GAME_CONFIG.CANVAS_HEIGHT + 50) {
            this.handleMissedApple();
        }
    }
    
    handleMissedApple() {
        this.game.data.takeDamage();
        
        if (this.game.data.getHealth() <= 0) {
            return;
        }
        
        this.apple = null;
        this.appleFalling = false;
        
        setTimeout(() => {
            this.spawnApple();
            this.appleFalling = true;
        }, 1000);
    }
    
    spawnExitDoor() {
        this.exitDoor = {
            x: GAME_CONFIG.CANVAS_WIDTH / 2 - 50,
            y: GAME_CONFIG.CANVAS_HEIGHT - 100,
            width: 100,
            height: 60
        };
        this.phase = 'completed';
    }
    
    checkDoorCollision() {
        if (this.exitDoor) {
            const playerDist = MathUtils.distance(
                this.player.x, this.player.y,
                this.exitDoor.x + this.exitDoor.width / 2,
                this.exitDoor.y + this.exitDoor.height / 2
            );
            
            if (playerDist < 80) {
                this.roomComplete();
            }
        }
    }
    
    render(ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        this.renderBackground(ctx);
        
        this.renderGrid(ctx);
        
        this.renderFallingBubbles(ctx);
        
        if (this.flyingBubble) {
            this.renderBubble(ctx, this.flyingBubble);
        }
        
        if (this.apple) {
            this.renderApple(ctx);
        }
        
        this.renderAimLine(ctx);
        
        this.renderPlayer(ctx);
        
        if (this.exitDoor) {
            this.renderExitDoor(ctx);
        }
        
        this.renderHUD(ctx);
    }
    
    renderBackground(ctx) {
        ctx.strokeStyle = 'rgba(100, 100, 150, 0.1)';
        ctx.lineWidth = 1;
        
        for (let y = 0; y < GAME_CONFIG.CANVAS_HEIGHT; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(GAME_CONFIG.CANVAS_WIDTH, y);
            ctx.stroke();
        }
    }
    
    renderGrid(ctx) {
        for (let row = 0; row < BUBBLE_GRID_ROWS; row++) {
            for (let col = 0; col < BUBBLE_GRID_COLS; col++) {
                const bubble = this.bubbleGrid[row][col];
                if (bubble) {
                    this.renderBubble(ctx, bubble);
                }
            }
        }
    }
    
    renderBubble(ctx, bubble) {
        const gradient = ctx.createRadialGradient(
            bubble.x - bubble.radius * 0.3,
            bubble.y - bubble.radius * 0.3,
            0,
            bubble.x,
            bubble.y,
            bubble.radius
        );
        
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, bubble.color);
        gradient.addColorStop(1, this.darkenColor(bubble.color, 0.5));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(bubble.x - bubble.radius * 0.3, bubble.y - bubble.radius * 0.3, bubble.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderFallingBubbles(ctx) {
        for (const bubble of this.fallingBubbles) {
            this.renderBubble(ctx, bubble);
        }
    }
    
    renderAimLine(ctx) {
        const startX = this.player.x;
        const startY = this.player.y - 30;
        const length = 150;
        
        const endX = startX + Math.cos(this.player.angle) * length;
        const endY = startY + Math.sin(this.player.angle) * length;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(endX, endY, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderPlayer(ctx) {
        const x = this.player.x;
        const y = this.player.y;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.player.angle + Math.PI / 2);
        
        const segmentSize = 10;
        const snakeSegments = [
            { x: 0, y: -20, w: segmentSize, h: segmentSize, isHead: true },
            { x: 0, y: -10, w: segmentSize, h: segmentSize, isHead: false },
            { x: 0, y: 0, w: segmentSize, h: segmentSize, isHead: false },
            { x: 0, y: 10, w: segmentSize, h: segmentSize, isHead: false },
            { x: -10, y: 0, w: segmentSize, h: segmentSize, isHead: false },
            { x: 10, y: 0, w: segmentSize, h: segmentSize, isHead: false },
        ];
        
        snakeSegments.forEach((seg, index) => {
            if (seg.isHead) {
                ctx.fillStyle = '#06d6a0';
                ctx.fillRect(seg.x - seg.w / 2, seg.y, seg.w, seg.h);
                
                ctx.fillStyle = '#fff';
                ctx.fillRect(seg.x - seg.w / 2 + 1, seg.y + 2, 2, 2);
                ctx.fillRect(seg.x - seg.w / 2 + 5, seg.y + 2, 2, 2);
            } else {
                ctx.fillStyle = index % 2 === 0 ? '#118ab2' : '#073b4c';
                ctx.fillRect(seg.x - seg.w / 2, seg.y, seg.w, seg.h);
            }
        });
        
        ctx.restore();
        
        if (this.player.currentBubble) {
            this.renderBubble(ctx, {
                x: x + Math.cos(this.player.angle) * 40,
                y: y - 30 + Math.sin(this.player.angle) * 40,
                radius: BUBBLE_RADIUS * 0.8,
                color: this.player.currentBubble.color
            });
        }
        
        if (this.player.nextBubble) {
            ctx.fillStyle = '#333';
            ctx.fillRect(x + 40, y - 10, 50, 30);
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 40, y - 10, 50, 30);
            
            this.renderBubble(ctx, {
                x: x + 65,
                y: y + 5,
                radius: BUBBLE_RADIUS * 0.6,
                color: this.player.nextBubble.color
            });
            
            ctx.fillStyle = '#aaa';
            ctx.font = '10px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('下一个', x + 65, y - 15);
        }
    }
    
    renderApple(ctx) {
        this.apple.glow = (this.apple.glow + 0.05) % (Math.PI * 2);
        RenderUtils.drawGlowingApple(ctx, this.apple.x, this.apple.y, this.apple.width, this.apple.height, this.apple.glow, true);
    }
    
    renderExitDoor(ctx) {
        RenderUtils.drawExitDoor(ctx, this.exitDoor.x, this.exitDoor.y, this.exitDoor.width, this.exitDoor.height, 'EXIT');
        
        ctx.fillStyle = '#06d6a0';
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('移动到出口！', GAME_CONFIG.CANVAS_WIDTH / 2, this.exitDoor.y - 20);
    }
    
    renderHUD(ctx) {
        ctx.fillStyle = '#fff';
        ctx.font = '16px Courier New';
        
        if (this.phase === 'playing') {
            if (this.appleFalling) {
                ctx.fillStyle = '#ffd700';
                ctx.fillText('接住金苹果！', GAME_CONFIG.CANVAS_WIDTH / 2 - 50, 30);
            } else {
                ctx.fillText('消除泡泡让苹果掉落！', GAME_CONFIG.CANVAS_WIDTH / 2 - 80, 30);
            }
        } else if (this.exitDoor) {
            ctx.fillStyle = '#06d6a0';
            ctx.fillText('移动到出口离开房间！', GAME_CONFIG.CANVAS_WIDTH / 2 - 90, 30);
        }
        
        ctx.fillStyle = '#aaa';
        ctx.font = '12px Courier New';
        ctx.fillText('←→ 调整角度 | 空格 发射', GAME_CONFIG.CANVAS_WIDTH / 2 - 100, GAME_CONFIG.CANVAS_HEIGHT - 20);
    }
    
    darkenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substring(0, 2), 16) * (1 - amount));
        const g = Math.max(0, parseInt(hex.substring(2, 4), 16) * (1 - amount));
        const b = Math.max(0, parseInt(hex.substring(4, 6), 16) * (1 - amount));
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }
}

window.BubbleRoom = BubbleRoom;
