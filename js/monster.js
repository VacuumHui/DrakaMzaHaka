import { GRID_SIZE } from './map.js';

export const MONSTER_TYPES = {
    GOBLIN: {
        name: 'Гоблин',
        health: 45,
        speed: 1.6,
        damage: 10,
        attackSpeed: 1000,
        goldReward: 8,
        imageKey: 'monster_goblin',
        color: '#2ecc71',
        evasive: true // Гоблин попробует обойти препятствие, если есть лазейка
    },
    ORC: {
        name: 'Орк',
        health: 140,
        speed: 0.8,
        damage: 25,
        attackSpeed: 1500,
        goldReward: 15,
        imageKey: 'monster_orc',
        color: '#e67e22',
        evasive: false // Орк идет напролом и крушит преграды
    },
    GOLEM: {
        name: 'Осадочный Голем',
        health: 450,
        speed: 0.4,
        damage: 60,
        attackSpeed: 2500,
        goldReward: 40,
        imageKey: 'monster_golem',
        color: '#95a5a6',
        evasive: false
    }
};

// Функция поиска монстра, идущего впереди на той же строке
function getMonsterInFront(monster, allMonsters) {
    let closest = null;
    let minDist = GRID_SIZE; // Дистанция коллизии (упираются друг в друга)

    for (let other of allMonsters) {
        if (other === monster || other.health <= 0) continue;
        if (other.row === monster.row && other.x < monster.x) {
            const dist = monster.x - other.x;
            if (dist < minDist) {
                minDist = dist;
                closest = other;
            }
        }
    }
    return closest;
}

export class Monster {
    constructor(row, config, startX) {
        this.row = row;
        this.config = config;
        this.x = startX;
        this.y = row * GRID_SIZE + GRID_SIZE / 2;
        this.health = config.health;
        this.maxHealth = config.health;
        this.speed = config.speed;
        
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.target = null; // Может быть объектом Tower или строкой 'wall'
    }

    update(dT, towers, allMonsters, damageWall, getTowerAt) {
        const gridX = Math.floor(this.x / GRID_SIZE);
        const nextGridX = Math.floor((this.x - 10) / GRID_SIZE);

        let blocked = false;
        this.target = null;

        // 1. Достиг ли монстр Стены Замка (колонка 1 и левее)
        if (nextGridX <= 1) {
            blocked = true;
            this.isAttacking = true;
            this.target = 'wall';
        }

        // 2. Проверка препятствия-башни на пути
        if (!blocked) {
            const towerAhead = getTowerAt(nextGridX, this.row);
            if (towerAhead) {
                // Если гоблин увертливый и соседняя строка свободна — он пробует обойти
                if (this.config.evasive) {
                    let detourRow = -1;
                    // Проверяем соседнюю верхнюю строку
                    if (this.row > 0 && !getTowerAt(nextGridX, this.row - 1)) {
                        detourRow = this.row - 1;
                    }
                    // Если нет, проверяем нижнюю
                    else if (this.row < 9 && !getTowerAt(nextGridX, this.row + 1)) {
                        detourRow = this.row + 1;
                    }

                    if (detourRow !== -1) {
                        // Меняем строку и обходим по диагонали
                        this.row = detourRow;
                        this.y = this.row * GRID_SIZE + GRID_SIZE / 2;
                    } else {
                        // Обход закрыт — атакуем
                        blocked = true;
                        this.isAttacking = true;
                        this.target = towerAhead;
                    }
                } else {
                    // Обычный штурмовик — атакуем
                    blocked = true;
                    this.isAttacking = true;
                    this.target = towerAhead;
                }
            }
        }

        // 3. Механика ПОМОЩИ СОРОДИЧАМ (групповой штурм)
        // Если перед монстром стоит его союзник, который уже заблокирован и бьет цель,
        // этот монстр тоже останавливается и бьет ту же самую цель!
        if (!blocked) {
            const allyAhead = getMonsterInFront(this, allMonsters);
            if (allyAhead && allyAhead.isAttacking && allyAhead.target) {
                blocked = true;
                this.isAttacking = true;
                this.target = allyAhead.target; // Подключаемся к атаке на ту же цель
            }
        }

        // Движение или атака
        if (!blocked) {
            this.isAttacking = false;
            this.x -= this.speed * (dT / 16);
        } else {
            // Наносим урон раз в определенный кулдаун
            this.attackCooldown -= dT;
            if (this.attackCooldown <= 0) {
                this.performAttack(damageWall);
                this.attackCooldown = this.config.attackSpeed;
            }
        }
    }

    performAttack(damageWall) {
        if (this.target === 'wall') {
            damageWall(this.config.damage);
        } else if (this.target && typeof this.target === 'object') {
            // Наносим урон башне, проверяем уничтожена ли она
            const destroyed = this.target.takeDamage(this.config.damage);
            if (destroyed) {
                this.isAttacking = false;
                this.target = null;
            }
        }
    }

    draw(ctx, images) {
        if (this.x < 0 || this.health <= 0) return;

        const img = images[this.config.imageKey];
        const size = GRID_SIZE * 0.85;

        ctx.save();
        if (img && img.width > 0) {
            ctx.drawImage(img, this.x - size / 2, this.y - size / 2, size, size);
        } else {
            ctx.fillStyle = this.config.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, size / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Полоска жизни монстра
        const barW = GRID_SIZE * 0.7;
        const barH = 4;
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x - barW / 2, this.y - GRID_SIZE / 2 - 5, barW, barH);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x - barW / 2, this.y - GRID_SIZE / 2 - 5, barW * (this.health / this.maxHealth), barH);
        ctx.restore();
    }
}
