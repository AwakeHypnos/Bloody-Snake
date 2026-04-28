const GAME_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    TILE_SIZE: 40,
    INITIAL_HEALTH: 5,
    ROOMS_TO_WIN: 4,
    INVINCIBLE_DURATION: 1500,
    FLASH_INTERVAL: 200
};

const ROOM_TYPES = {
    SNAKE: 'snake',
    SHOOTER: 'shooter',
    SPACESHIP: 'spaceship',
    JUMP: 'jump',
    FALL: 'fall',
    RUSSIAN_ROULETTE: 'russian_roulette',
    RACE: 'race'
};

const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    TRANSITION: 'transition',
    GAME_OVER: 'gameover',
    VICTORY: 'victory'
};

const ROOM_DISPLAY_NAMES = {
    [ROOM_TYPES.SNAKE]: '🐍 贪吃蛇房间',
    [ROOM_TYPES.SHOOTER]: '🔫 横版射击房间',
    [ROOM_TYPES.SPACESHIP]: '🚀 宇宙飞船房间',
    [ROOM_TYPES.JUMP]: '🦘 跳跃房间',
    [ROOM_TYPES.FALL]: '⬇️ 下落房间',
    [ROOM_TYPES.RUSSIAN_ROULETTE]: '🎰 俄罗斯轮盘赌房间',
    [ROOM_TYPES.RACE]: '🏎️ 赛蛇房间'
};

const TRANSITION_TEXTS = [
    '进入下一个房间...',
    '新的挑战等待着你...',
    '准备战斗！',
    '神秘的苹果就在前方...'
];

window.GAME_CONFIG = GAME_CONFIG;
window.ROOM_TYPES = ROOM_TYPES;
window.GAME_STATES = GAME_STATES;
window.ROOM_DISPLAY_NAMES = ROOM_DISPLAY_NAMES;
window.TRANSITION_TEXTS = TRANSITION_TEXTS;
