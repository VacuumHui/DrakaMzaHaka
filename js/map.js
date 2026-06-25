export const GRID_SIZE = 48;
export const MAP_COLS = 20;
export const MAP_ROWS = 10;

// Инициализируем карту: 0 - пустая трава, 1 - стена замка (колонки 0 и 1)
export let gameMap = [];

export function initMap() {
    gameMap = Array(MAP_ROWS).fill(null).map(() => Array(MAP_COLS).fill(0));
    for (let r = 0; r < MAP_ROWS; r++) {
        gameMap[r][0] = 1; // Стена
        gameMap[r][1] = 1; // Стена (прилегающая территория замка)
    }
}

export function drawMap(ctx, images) {
    for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
            const x = c * GRID_SIZE;
            const y = r * GRID_SIZE;

            // Сначала всегда рисуем траву как подложку
            if (images.grass && images.grass.width > 0) {
                ctx.drawImage(images.grass, x, y, GRID_SIZE, GRID_SIZE);
            } else {
                ctx.fillStyle = '#27ae60';
                ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
            }

            // Если это зона стены, рисуем текстуру стены поверх
            if (gameMap[r][c] === 1) {
                if (images.wall && images.wall.width > 0) {
                    ctx.drawImage(images.wall, x, y, GRID_SIZE, GRID_SIZE);
                } else {
                    ctx.fillStyle = '#7f8c8d';
                    ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
                    ctx.strokeStyle = '#2c3e50';
                    ctx.strokeRect(x, y, GRID_SIZE, GRID_SIZE);
                }
            }
        }
    }
}
