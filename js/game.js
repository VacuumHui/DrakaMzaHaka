import { loadAllAssets, assets } from './loader.js';
import { GRID_SIZE, MAP_COLS, MAP_ROWS, gameMap, initMap, drawMap } from './map.js';
import { TOWER_TYPES, Tower } from './tower.js';
import { MONSTER_TYPES, Monster } from './monster.js';
import { Projectile } from './projectile.js';

// Инициализация холста
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = MAP_COLS * GRID_SIZE;
canvas.height = MAP_ROWS * GRID_SIZE;

// UI Элементы
const wallHpEl = document.getElementById('wallHp');
const goldEl = document.getElementById('gold');
const waveEl = document.getElementById('wave');
const buildMenuEl = document.getElementById('buildMenu');
const actionButton = document.getElementById('actionButton');
const messagesEl = document.getElementById('messages');
const gameContainer = document.getElementById('gameContainer');
const loadingScreen = document.getElementById('loadingScreen');

// Переменные состояния игры
let wallHp = 500;
let maxWallHp = 500;
let gold = 200;
let currentWave = 0;
let waveInProgress = false;

let towers = [];
let monsters = [];
let projectiles = [];

let selectedTowerType = null;
let lastTime = 0;
let gameOver = false;

// 1. Предзагрузка
loadAllAssets(
    (progress, lastKey) => {
        const progressBar = document.getElementById('progressBar');
        const loadingStatus = document.getElementById('loadingStatus');
        progressBar.style.width = `${progress * 100}%`;
        loadingStatus.textContent = `Загружено: ${lastKey}.png`;
    },
    () => {
        loadingScreen.style.display = 'none';
        gameContainer.style.display = 'flex';
        initGame();
    }
);

function initGame() {
    initMap();
    createBuildMenu();
    updateUI();
    
    // Слушатели событий
    canvas.addEventListener('click', handleCanvasClick);
    actionButton.addEventListener('click', startWave);
    
    // Запуск цикла
    requestAnimationFrame(gameLoop);
}

function updateUI() {
    wallHpEl.textContent = wallHp;
    goldEl.textContent = gold;
    waveEl.textContent = currentWave;
}

function showMessage(text) {
    messagesEl.textContent = text;
    setTimeout(() => {
        if (messagesEl.textContent === text) messagesEl.textContent = '';
    }, 3000);
}

// Меню постройки башен
function createBuildMenu() {
    buildMenuEl.innerHTML = '';
    for (let key in TOWER_TYPES) {
        const t = TOWER_TYPES[key];
        const btn = document.createElement('div');
        btn.classList.add('build-btn');
        btn.innerHTML = `
            <span>${t.name} (${t.type === 'wall' ? 'Стена' : 'Поле'})</span>
            <strong>${t.cost}💰</strong>
        `;
        btn.dataset.id = key;
        btn.onclick = () => selectTowerToBuild(key);
        buildMenuEl.appendChild(btn);
    }
}

function selectTowerToBuild(key) {
    if (selectedTowerType === key) {
        selectedTowerType = null;
    } else {
        selectedTowerType = key;
    }
    
    document.querySelectorAll('.build-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.id === selectedTowerType) btn.classList.add('selected');
    });
}

// Клик по карте для постройки
function handleCanvasClick(e) {
    if (gameOver || !selectedTowerType) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const gridX = Math.floor(clickX / GRID_SIZE);
    const gridY = Math.floor(clickY / GRID_SIZE);

    const config = TOWER_TYPES[selectedTowerType];

    if (gold < config.cost) {
        showMessage('⚠️ Недостаточно золота!');
        return;
    }

    // Проверка ограничений по типу башни
    const isWallTile = (gameMap[gridY][gridX] === 1);

    if (config.type === 'wall' && !isWallTile) {
        showMessage('🚫 Строить можно только НА стене!');
        return;
    }
    if (config.type === 'ground' && isWallTile) {
        showMessage('🚫 Строить можно только НА поле перед стеной!');
        return;
    }

    // Проверяем, свободна ли клетка
    const alreadyHasTower = towers.some(t => t.gridX === gridX && t.gridY === gridY);
    if (alreadyHasTower) {
        showMessage('🚫 Эта клетка уже занята!');
        return;
    }

    // Строим
    gold -= config.cost;
    const newTower = new Tower(gridX, gridY, config);
    towers.push(newTower);
    
    // Если башня наземная, она физически преграждает путь (gameMap = 2)
    if (config.type === 'ground') {
        gameMap[gridY][gridX] = 2;
    }

    updateUI();
    selectTowerToBuild(null); // Снимаем выделение
}

// Функция получения башни по координатам (для монстров)
function getTowerAt(gridX, gridY) {
    if (gridX < 0 || gridY < 0 || gridX >= MAP_COLS || gridY >= MAP_ROWS) return null;
    return towers.find(t => t.gridX === gridX && t.gridY === gridY) || null;
}

// Старт волны
function startWave() {
    if (waveInProgress || gameOver) return;
    waveInProgress = true;
    currentWave++;
    actionButton.style.display = 'none';
    updateUI();

    // Генерация монстров за пределами экрана (X = canvas.width + 50)
    const spawnX = canvas.width + 50;
    const waveSetup = getWaveConfig(currentWave);

    let count = 0;
    const spawnInterval = setInterval(() => {
        if (gameOver) {
            clearInterval(spawnInterval);
            return;
        }

        const randomRow = Math.floor(Math.random() * MAP_ROWS);
        const monsterConfig = waveSetup.pool[Math.floor(Math.random() * waveSetup.pool.length)];
        
        monsters.push(new Monster(randomRow, monsterConfig, spawnX));
        count++;

        if (count >= waveSetup.total) {
            clearInterval(spawnInterval);
        }
    }, waveSetup.delay);
}

// Настройка сложности волн
function getWaveConfig(wave) {
    const pool = [MONSTER_TYPES.GOBLIN];
    if (wave >= 2) pool.push(MONSTER_TYPES.ORC);
    if (wave >= 4) pool.push(MONSTER_TYPES.GOLEM);

    return {
        pool: pool,
        total: 5 + wave * 3,
        delay: Math.max(600, 1500 - wave * 100)
    };
}

// Нанесение урона стене
function damageWall(amount) {
    wallHp -= amount;
    if (wallHp <= 0) {
        wallHp = 0;
        gameOver = true;
    }
    updateUI();
}

// Основной цикл
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dT = Math.min(timestamp - lastTime, 100);
    lastTime = timestamp;

    if (!gameOver) {
        update(dT);
        draw();
        requestAnimationFrame(gameLoop);
    } else {
        drawGameOver();
    }
}

function update(dT) {
    // Обновление башен
    towers.forEach(t => t.update(dT, monsters, (tower, target) => {
        projectiles.push(new Projectile(tower.x, tower.y, target, tower.config));
    }));

    // Обновление монстров
    monsters.forEach(m => m.update(dT, towers, monsters, damageWall, getTowerAt));

    // Обновление снарядов
    projectiles.forEach(p => p.update(dT, monsters));

    // Проверка погибших башен (очищаем карту)
    towers = towers.filter(t => {
        if (t.hp <= 0 && t.maxHp > 0) {
            gameMap[t.gridY][t.gridX] = 0; // Клетка на поле снова свободна
            return false;
        }
        return true;
    });

    // Очистка погибших монстров и снарядов
    monsters = monsters.filter(m => {
        if (m.health <= 0) {
            gold += m.config.goldReward;
            updateUI();
            return false;
        }
        return true;
    });
    projectiles = projectiles.filter(p => p.active);

    // Проверка окончания волны
    if (waveInProgress && monsters.length === 0) {
        waveInProgress = false;
        actionButton.style.display = 'block';
        gold += 40 + currentWave * 5; // Бонус за волну
        updateUI();
        showMessage(`🎉 Волна ${currentWave} пройдена!`);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем поле
    drawMap(ctx, assets.images);

    // Рисуем башни
    towers.forEach(t => t.draw(ctx, assets.images));

    // Рисуем монстров
    monsters.forEach(m => m.draw(ctx, assets.images));

    // Рисуем снаряды
    projectiles.forEach(p => p.draw(ctx, assets.images));
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "30px 'Press Start 2P', monospace";
    ctx.fillStyle = '#e74c3c';
    ctx.textAlign = 'center';
    ctx.fillText("КРЕПОСТЬ ПАЛА!", canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = "16px 'Roboto', sans-serif";
    ctx.fillStyle = '#fff';
    ctx.fillText("Обновите страницу на GitHub Pages, чтобы начать заново.", canvas.width / 2, canvas.height / 2 + 30);
}
