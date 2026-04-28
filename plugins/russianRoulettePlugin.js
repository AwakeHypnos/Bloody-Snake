const ROULETTE_ITEM_TYPES = {
    BULLET_BELT: 'bullet_belt',
    IRON_CONE: 'iron_cone',
    MAGNIFYING_GLASS: 'magnifying_glass',
    GUNPOWDER_FLASK: 'gunpowder_flask',
    WATER_BASIN: 'water_basin'
};

const ROULETTE_ITEM_NAMES = {
    [ROULETTE_ITEM_TYPES.BULLET_BELT]: '子弹带',
    [ROULETTE_ITEM_TYPES.IRON_CONE]: '铁锥',
    [ROULETTE_ITEM_TYPES.MAGNIFYING_GLASS]: '放大镜',
    [ROULETTE_ITEM_TYPES.GUNPOWDER_FLASK]: '火药壶',
    [ROULETTE_ITEM_TYPES.WATER_BASIN]: '水盆'
};

const ROULETTE_ITEM_DESCRIPTIONS = {
    [ROULETTE_ITEM_TYPES.BULLET_BELT]: '增加1发子弹',
    [ROULETTE_ITEM_TYPES.IRON_CONE]: '退出1发子弹',
    [ROULETTE_ITEM_TYPES.MAGNIFYING_GLASS]: '查看弹仓当前位置是否有子弹',
    [ROULETTE_ITEM_TYPES.GUNPOWDER_FLASK]: '下次射击伤害+1',
    [ROULETTE_ITEM_TYPES.WATER_BASIN]: '下次射击50%概率哑火'
};

const REVOLVER_CHAMBER_SIZE = 8;

class RussianRouletteRoom extends BaseRoomPlugin {
    constructor(game) {
        super(game);
        this.roomType = ROOM_TYPES.RUSSIAN_ROULETTE;
        
        this.phase = 'ready';
        this.turn = 'player';
        this.round = 1;
        
        this.playerHealth = GAME_CONFIG.INITIAL_HEALTH;
        this.aiHealth = 1;
        
        this.chamber = new Array(REVOLVER_CHAMBER_SIZE).fill(false);
        this.currentChamber = 0;
        this.totalBullets = 0;
        
        this.playerItems = [];
        this.aiItems = [];
        
        this.gunpowderActive = { player: false, ai: false };
        this.waterBasinActive = { player: false, ai: false };
        
        this.chamberRevealed = false;
        this.revealedResult = null;
        
        this.message = '';
        this.messageTimer = 0;
        this.animationPhase = null;
        this.animationTimer = 0;
        
        this.selectedItemIndex = -1;
        
        this.spinning = false;
        this.spinAngle = 0;
        
        this.exitDoor = null;
        this.roomCompleted = false;
        
        this.initializeGame();
    }
    
    initializeGame() {
        this.totalBullets = MathUtils.randomInt(1, Math.floor(REVOLVER_CHAMBER_SIZE / 2));
        this.chamber = new Array(REVOLVER_CHAMBER_SIZE).fill(false);
        
        let bulletsPlaced = 0;
        while (bulletsPlaced < this.totalBullets) {
            const pos = Math.floor(Math.random() * REVOLVER_CHAMBER_SIZE);
            if (!this.chamber[pos]) {
                this.chamber[pos] = true;
                bulletsPlaced++;
            }
        }
        
        this.currentChamber = Math.floor(Math.random() * REVOLVER_CHAMBER_SIZE);
        
        this.playerItems = this.drawItems(2);
        this.aiItems = this.drawItems(2);
        
        this.phase = 'player_turn';
        this.turn = 'player';
        this.message = '轮到你了！选择道具或开枪';
    }
    
    drawItems(count) {
        const items = [];
        const allTypes = Object.values(ROULETTE_ITEM_TYPES);
        
        for (let i = 0; i < count; i++) {
            const type = allTypes[Math.floor(Math.random() * allTypes.length)];
            items.push({ type: type, used: false });
        }
        
        return items;
    }
    
    handleInput() {
        if (this.phase !== 'player_turn') return;
        
        if (this.game.keys[' ']) {
            this.game.keys[' '] = false;
            this.shoot();
        }
        
        if (this.game.keys['ArrowLeft'] || this.game.keys['a']) {
            this.game.keys['ArrowLeft'] = false;
            this.game.keys['a'] = false;
            this.selectedItemIndex = Math.max(0, this.selectedItemIndex - 1);
        }
        
        if (this.game.keys['ArrowRight'] || this.game.keys['d']) {
            this.game.keys['ArrowRight'] = false;
            this.game.keys['d'] = false;
            const maxIndex = this.playerItems.filter(i => !i.used).length - 1;
            this.selectedItemIndex = Math.min(maxIndex, this.selectedItemIndex + 1);
        }
        
        if (this.game.keys['Enter'] && this.selectedItemIndex >= 0) {
            this.game.keys['Enter'] = false;
            this.usePlayerItem();
        }
    }
    
    usePlayerItem() {
        const availableItems = this.playerItems.filter(i => !i.used);
        if (this.selectedItemIndex >= availableItems.length) return;
        
        const item = availableItems[this.selectedItemIndex];
        if (!item) return;
        
        this.useItem(item, 'player');
        
        this.selectedItemIndex = Math.min(this.selectedItemIndex, this.playerItems.filter(i => !i.used).length - 1);
    }
    
    useItem(item, user) {
        if (item.used) return;
        item.used = true;
        
        switch(item.type) {
            case ROULETTE_ITEM_TYPES.BULLET_BELT:
                this.addBullet();
                this.showMessage(`${user === 'player' ? '你' : 'AI'}使用了子弹带，添加1发子弹`);
                break;
                
            case ROULETTE_ITEM_TYPES.IRON_CONE:
                this.removeBullet();
                this.showMessage(`${user === 'player' ? '你' : 'AI'}使用了铁锥，退出1发子弹`);
                break;
                
            case ROULETTE_ITEM_TYPES.MAGNIFYING_GLASS:
                this.revealChamber(user);
                this.showMessage(`${user === 'player' ? '你' : 'AI'}使用了放大镜查看弹仓`);
                break;
                
            case ROULETTE_ITEM_TYPES.GUNPOWDER_FLASK:
                this.gunpowderActive[user] = true;
                this.showMessage(`${user === 'player' ? '你' : 'AI'}使用了火药壶，下次伤害+1`);
                break;
                
            case ROULETTE_ITEM_TYPES.WATER_BASIN:
                this.waterBasinActive[user] = true;
                this.showMessage(`${user === 'player' ? '你' : 'AI'}使用了水盆，下次50%概率哑火`);
                break;
        }
    }
    
    addBullet() {
        const emptyChambers = [];
        for (let i = 0; i < REVOLVER_CHAMBER_SIZE; i++) {
            if (!this.chamber[i]) {
                emptyChambers.push(i);
            }
        }
        
        if (emptyChambers.length > 0) {
            const pos = emptyChambers[Math.floor(Math.random() * emptyChambers.length)];
            this.chamber[pos] = true;
            this.totalBullets++;
        }
    }
    
    removeBullet() {
        const loadedChambers = [];
        for (let i = 0; i < REVOLVER_CHAMBER_SIZE; i++) {
            if (this.chamber[i]) {
                loadedChambers.push(i);
            }
        }
        
        if (loadedChambers.length > 0) {
            const pos = loadedChambers[Math.floor(Math.random() * loadedChambers.length)];
            this.chamber[pos] = false;
            this.totalBullets--;
        }
    }
    
    revealChamber(user) {
        this.chamberRevealed = true;
        this.revealedResult = this.chamber[this.currentChamber];
        if (user === 'player') {
            this.showMessage(this.revealedResult ? '当前弹仓有子弹！' : '当前弹仓是空的！');
        }
        setTimeout(() => {
            this.chamberRevealed = false;
            this.revealedResult = null;
        }, 2000);
    }
    
    shoot() {
        if (this.phase !== 'player_turn' && this.phase !== 'ai_turn') return;
        
        const user = this.turn;
        
        let misfired = false;
        if (this.waterBasinActive[user]) {
            this.waterBasinActive[user] = false;
            if (Math.random() < 0.5) {
                misfired = true;
                this.showMessage(`${user === 'player' ? '你' : 'AI'}的枪哑火了！`);
                this.advanceChamber();
                this.endTurn();
                return;
            }
        }
        
        this.spinning = true;
        this.animationPhase = 'spinning';
        
        setTimeout(() => {
            this.spinning = false;
            this.animationPhase = 'firing';
            
            const hasBullet = this.chamber[this.currentChamber];
            
            if (hasBullet) {
                let damage = 1;
                if (this.gunpowderActive[user]) {
                    damage = 2;
                    this.gunpowderActive[user] = false;
                }
                
                if (user === 'player') {
                    this.playerHealth = Math.max(0, this.playerHealth - damage);
                    this.game.data.setHealth(this.playerHealth);
                    this.showMessage(`砰！你中枪了，受到${damage}点伤害！`);
                } else {
                    this.aiHealth = Math.max(0, this.aiHealth - damage);
                    this.showMessage(`砰！AI中枪了，受到${damage}点伤害！`);
                }
                
                this.animationPhase = 'hit';
            } else {
                this.showMessage('咔哒！空枪！');
                this.animationPhase = 'miss';
            }
            
            this.chamber[this.currentChamber] = false;
            if (hasBullet) {
                this.totalBullets--;
            }
            this.advanceChamber();
            
            setTimeout(() => {
                this.animationPhase = null;
                this.checkGameEnd();
            }, 1000);
        }, 500);
    }
    
    advanceChamber() {
        this.currentChamber = (this.currentChamber + 1) % REVOLVER_CHAMBER_SIZE;
    }
    
    endTurn() {
        if (this.turn === 'player') {
            this.turn = 'ai';
            this.phase = 'ai_turn';
            setTimeout(() => this.aiTurn(), 1000);
        } else {
            this.turn = 'player';
            this.phase = 'player_turn';
            
            if (this.round > 1) {
                const newItem = this.drawItems(1)[0];
                this.playerItems.push(newItem);
                this.showMessage('新回合开始，你获得了一个新道具！');
            }
            this.round++;
        }
    }
    
    aiTurn() {
        if (this.phase !== 'ai_turn') return;
        
        const availableItems = this.aiItems.filter(i => !i.used);
        
        if (availableItems.length > 0) {
            const item = availableItems[Math.floor(Math.random() * availableItems.length)];
            if (Math.random() < 0.5) {
                this.useItem(item, 'ai');
                setTimeout(() => this.aiDecideAction(), 1000);
                return;
            }
        }
        
        this.aiDecideAction();
    }
    
    aiDecideAction() {
        this.shoot();
    }
    
    checkGameEnd() {
        if (this.playerHealth <= 0) {
            this.phase = 'game_over';
            return;
        }
        
        if (this.aiHealth <= 0) {
            this.phase = 'victory';
            this.roomCompleted = true;
            this.spawnExitDoor();
            return;
        }
        
        if (this.totalBullets <= 0) {
            this.phase = 'victory';
            this.roomCompleted = true;
            this.showMessage('弹仓已空，你赢了！');
            this.spawnExitDoor();
            return;
        }
        
        this.endTurn();
    }
    
    spawnExitDoor() {
        this.exitDoor = {
            x: GAME_CONFIG.CANVAS_WIDTH / 2 - 50,
            y: GAME_CONFIG.CANVAS_HEIGHT - 100,
            width: 100,
            height: 60
        };
    }
    
    showMessage(msg) {
        this.message = msg;
        this.messageTimer = 3000;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        this.handleInput();
        
        if (this.messageTimer > 0) {
            this.messageTimer -= deltaTime;
        }
        
        if (this.spinning) {
            this.spinAngle += deltaTime * 0.01;
        }
        
        if (this.roomCompleted && this.exitDoor) {
            if (this.game.keys[' '] || this.game.keys['ArrowUp']) {
                this.roomComplete();
            }
        }
    }
    
    render(ctx) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        
        this.renderTable(ctx);
        this.renderRevolver(ctx);
        this.renderStatus(ctx);
        this.renderItems(ctx);
        this.renderMessage(ctx);
        
        if (this.exitDoor) {
            this.renderExitDoor(ctx);
        }
    }
    
    renderTable(ctx) {
        const tableX = 50;
        const tableY = 150;
        const tableWidth = GAME_CONFIG.CANVAS_WIDTH - 100;
        const tableHeight = 300;
        
        ctx.fillStyle = '#4a3728';
        ctx.fillRect(tableX, tableY, tableWidth, tableHeight);
        
        ctx.strokeStyle = '#3d2d1f';
        ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(tableX, tableY + i * 30);
            ctx.lineTo(tableX + tableWidth, tableY + i * 30);
            ctx.stroke();
        }
        
        ctx.strokeStyle = '#2d1f14';
        ctx.lineWidth = 4;
        ctx.strokeRect(tableX, tableY, tableWidth, tableHeight);
    }
    
    renderRevolver(ctx) {
        const centerX = GAME_CONFIG.CANVAS_WIDTH / 2;
        const centerY = 300;
        const radius = 80;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.spinAngle);
        
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        const chamberRadius = 15;
        const chamberOffset = radius - 30;
        
        for (let i = 0; i < REVOLVER_CHAMBER_SIZE; i++) {
            const angle = (i / REVOLVER_CHAMBER_SIZE) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * chamberOffset;
            const y = Math.sin(angle) * chamberOffset;
            
            const isCurrent = i === this.currentChamber;
            const hasBullet = this.chamber[i];
            
            ctx.fillStyle = hasBullet ? '#ff6b6b' : '#666';
            ctx.beginPath();
            ctx.arc(x, y, chamberRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = isCurrent ? '#ffd700' : '#333';
            ctx.lineWidth = isCurrent ? 4 : 2;
            ctx.stroke();
            
            if (isCurrent) {
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(x, y, chamberRadius + 5, 0, Math.PI * 2);
                ctx.globalAlpha = 0.3;
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
            
            if (this.chamberRevealed && isCurrent) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.revealedResult ? '●' : '○', x, y);
            }
        }
        
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
        
        ctx.fillStyle = '#fff';
        ctx.font = '16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(`子弹数: ${this.totalBullets}/${REVOLVER_CHAMBER_SIZE}`, centerX, centerY + radius + 30);
    }
    
    renderStatus(ctx) {
        const playerX = 100;
        const aiX = GAME_CONFIG.CANVAS_WIDTH - 100;
        const statusY = 50;
        
        ctx.fillStyle = '#06d6a0';
        ctx.font = 'bold 18px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText('你的生命:', playerX, statusY);
        
        for (let i = 0; i < GAME_CONFIG.INITIAL_HEALTH; i++) {
            ctx.fillStyle = i < this.playerHealth ? '#ff6b6b' : '#333';
            ctx.fillText('❤️', playerX + 110 + i * 25, statusY);
        }
        
        ctx.fillStyle = '#e94560';
        ctx.textAlign = 'right';
        ctx.fillText('AI生命:', aiX, statusY);
        
        for (let i = 0; i < 1; i++) {
            ctx.fillStyle = i < this.aiHealth ? '#ff6b6b' : '#333';
            ctx.fillText('❤️', aiX - 70 + i * 25, statusY);
        }
        
        ctx.fillStyle = this.turn === 'player' ? '#06d6a0' : '#e94560';
        ctx.font = 'bold 20px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(
            this.turn === 'player' ? '👤 你的回合' : '🤖 AI回合',
            GAME_CONFIG.CANVAS_WIDTH / 2,
            statusY
        );
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px Courier New';
        ctx.fillText(`第 ${this.round} 回合`, GAME_CONFIG.CANVAS_WIDTH / 2, statusY + 25);
    }
    
    renderItems(ctx) {
        const startX = 100;
        const startY = GAME_CONFIG.CANVAS_HEIGHT - 80;
        const itemWidth = 60;
        const itemHeight = 50;
        const spacing = 15;
        
        const availableItems = this.playerItems.filter(i => !i.used);
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText('你的道具 (←→选择, Enter使用):', startX, startY - 15);
        
        availableItems.forEach((item, index) => {
            const x = startX + index * (itemWidth + spacing);
            const isSelected = index === this.selectedItemIndex;
            
            ctx.fillStyle = isSelected ? '#ffd700' : '#444';
            ctx.fillRect(x, startY, itemWidth, itemHeight);
            
            ctx.strokeStyle = isSelected ? '#fff' : '#666';
            ctx.lineWidth = isSelected ? 3 : 1;
            ctx.strokeRect(x, startY, itemWidth, itemHeight);
            
            const emoji = this.getItemEmoji(item.type);
            ctx.fillStyle = '#fff';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(emoji, x + itemWidth / 2, startY + itemHeight / 2 + 8);
            
            if (isSelected) {
                ctx.fillStyle = '#ffd700';
                ctx.font = '12px Courier New';
                ctx.fillText(ROULETTE_ITEM_NAMES[item.type], x + itemWidth / 2, startY - 5);
            }
        });
        
        if (availableItems.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '14px Courier New';
            ctx.textAlign = 'left';
            ctx.fillText('没有可用道具', startX, startY + 30);
        }
        
        if (this.phase === 'player_turn') {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 16px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('按 [空格] 开枪', GAME_CONFIG.CANVAS_WIDTH / 2, startY + 30);
        }
        
        if (this.gunpowderActive.player) {
            ctx.fillStyle = '#ff6b6b';
            ctx.font = '12px Courier New';
            ctx.textAlign = 'left';
            ctx.fillText('🔥 火药壶激活', startX, startY + itemHeight + 20);
        }
        if (this.waterBasinActive.player) {
            ctx.fillStyle = '#4cc9f0';
            ctx.font = '12px Courier New';
            ctx.textAlign = 'left';
            ctx.fillText('💧 水盆激活', startX + 120, startY + itemHeight + 20);
        }
    }
    
    getItemEmoji(type) {
        switch(type) {
            case ROULETTE_ITEM_TYPES.BULLET_BELT: return '🎒';
            case ROULETTE_ITEM_TYPES.IRON_CONE: return '🔧';
            case ROULETTE_ITEM_TYPES.MAGNIFYING_GLASS: return '🔍';
            case ROULETTE_ITEM_TYPES.GUNPOWDER_FLASK: return '🔥';
            case ROULETTE_ITEM_TYPES.WATER_BASIN: return '💧';
            default: return '❓';
        }
    }
    
    renderMessage(ctx) {
        if (this.messageTimer <= 0 || !this.message) return;
        
        const alpha = Math.min(1, this.messageTimer / 500);
        ctx.save();
        ctx.globalAlpha = alpha;
        
        const msgX = GAME_CONFIG.CANVAS_WIDTH / 2;
        const msgY = 120;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        const textWidth = ctx.measureText(this.message).width || 300;
        ctx.fillRect(msgX - textWidth / 2 - 20, msgY - 20, textWidth + 40, 40);
        
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(msgX - textWidth / 2 - 20, msgY - 20, textWidth + 40, 40);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.message, msgX, msgY);
        
        ctx.restore();
    }
    
    renderExitDoor(ctx) {
        RenderUtils.drawExitDoor(ctx, this.exitDoor.x, this.exitDoor.y, this.exitDoor.width, this.exitDoor.height, 'EXIT');
        
        ctx.fillStyle = '#06d6a0';
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('按 [空格/↑] 离开房间！', GAME_CONFIG.CANVAS_WIDTH / 2, this.exitDoor.y - 20);
    }
}

window.RussianRouletteRoom = RussianRouletteRoom;
