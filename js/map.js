export const GRID_SIZE = 48;
export const MAP_COLS = 20;
export const MAP_ROWS = 10;

export let gameMap = [];

export function initMap() {
    gameMap = Array(MAP_ROWS).fill(null).map(() => Array(MAP_COLS).fill(0));
    for (let r = 0; r < MAP_ROWS; r++) {
        gameMap[r][0] = 1; // Стена замка (слот под башни)
        gameMap[r][1] = 1; // Прилегающая к стене территория
    }
}

export function drawMap(ctx, images) {
    const totalWidth = MAP_COLS * GRID_SIZE;
    const totalHeight = MAP_ROWS * GRID_SIZE;

    // 1. Рисуем красивый цельный фон на весь экран
    if (images.background && images.background.width > 0) {
        ctx.drawImage(images.background, 0, 0, totalWidth, totalHeight);
    } else {
        // Запасной фон, если картинки нет
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 0, totalWidth, totalHeight);
    }

    // 2. Рисуем стену на первых двух колонках поверх фона
    for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < 2; c++) {
            const x = c * GRID_SIZE;
            const y = r * GRID_SIZE;

            if (images.wall && images.wall.width > 0) {
                // Чтобы фон за стеной немного угадывался, можно сделать стену слегка прозрачной
                ctx.save();
                ctx.globalAlpha = 0.85; // Стена будет полупрозрачной (можно убрать для полной непрозрачности)
                ctx.drawImage(images.wall, x, y, GRID_SIZE, GRID_SIZE);
                ctx.restore();
            } else {
                // Запасная текстура стены, если нет картинки
                ctx.fillStyle = 'rgba(127, 140, 141, 0.75)'; // Серый цвет с полупрозрачностью
                ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
                ctx.strokeStyle = 'rgba(44, 62, 80, 0.5)';
                ctx.strokeRect(x, y, GRID_SIZE, GRID_SIZE);
            }
        }
    }
}
