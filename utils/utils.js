const CollisionUtils = {
    checkRectCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    },
    
    checkPlatformCollision(player, platform) {
        const playerBottom = player.y + player.height;
        const playerPrevBottom = playerBottom - (player.vy || 0);
        
        return player.x + player.width > platform.x &&
               player.x < platform.x + platform.width &&
               playerBottom >= platform.y &&
               playerPrevBottom <= platform.y + 10;
    },
    
    checkPointInRect(point, rect) {
        return point.x >= rect.x &&
               point.x <= rect.x + rect.width &&
               point.y >= rect.y &&
               point.y <= rect.y + rect.height;
    }
};

const MathUtils = {
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    
    lerp(start, end, t) {
        return start + (end - start) * t;
    },
    
    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    shuffleArray(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },
    
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
};

const RenderUtils = {
    drawCircle(ctx, x, y, radius, fillColor, strokeColor = null, lineWidth = 1) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    },
    
    drawRect(ctx, x, y, width, height, fillColor, strokeColor = null, lineWidth = 1) {
        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fillRect(x, y, width, height);
        }
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(x, y, width, height);
        }
    },
    
    drawGlowingApple(ctx, x, y, width, height, glow, isGolden = true) {
        const glowRadius = Math.sin(glow) * 8 + 8;
        const mainColor = isGolden ? '#ffd700' : '#e63946';
        const glowColor = isGolden ? 'rgba(255, 215, 0, 0.4)' : 'rgba(230, 57, 70, 0.3)';
        
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height / 2, width / 2 + glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = glowColor;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
        ctx.fillStyle = mainColor;
        ctx.fill();
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + width / 2 - 8, y + height / 2 - 8, 6, 0, Math.PI * 2);
        ctx.fill();
    },
    
    drawExitDoor(ctx, x, y, width, height, label = 'EXIT') {
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x, y, width, height);
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Courier New';
        ctx.fillText(label, x + 8, y + height / 2 + 6);
    }
};

window.CollisionUtils = CollisionUtils;
window.MathUtils = MathUtils;
window.RenderUtils = RenderUtils;
