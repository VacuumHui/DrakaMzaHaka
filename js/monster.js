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
        evasive: true
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
        evasive: false
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

function getMonsterInFront(monster, allMonsters) {
    let closest = null;
    let minDist = GRID_SIZE;

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
        this.target = null;

        // Переменные для покадровой анимации
        this.animFrame = 0;
        this.animTime = 0;
        this.frameCount = 8;       // Количество кадров в ваших спрайтшитах
        this.frameDuration = 120;  // Длительность одного кадра в мс
    }

    update(dT, towers, allMonsters, damageWall, getTowerAt) {
        const nextGridX = Math.floor((this.x - 10) / GRID_SIZE);
        let blocked = false;
        this.target = null;

        // Обновление кадра анимации
        this.animTime += dT;
        if (this.animTime >= this.frameDuration) {
            this.animFrame = (this.animFrame + 1) % this.frameCount;
            this.animTime = 0;
        }

        // 1. Проверка Стены Замка
        if (nextGridX <= 1) {
            blocked = true;
            this.isAttacking = true;
            this.target = 'wall';
        }

        // 2. Проверка башни на пути
        if (!blocked) {
            const towerAhead = getTowerAt(nextGridX, this.row);
            if (towerAhead) {
                if (this.config.evasive) {
                    let detourRow = -1;
                    if (this.row > 0 && !getTowerAt(nextGridX, this.row - 1)) {
                        detourRow = this.row - 1;
                    } else if (this.row < 9 && !getTowerAt(nextGridX, this.row + 1)) {
                        detourRow = this.row + 1;
                    }

                    if (detourRow !== -1) {
                        this.row = detourRow;
                        this.y = this.row * GRID_SIZE + GRID_SIZE / 2;
                    } else {
                        blocked = true;
                        this.isAttacking = true;
                        this.target = towerAhead;
                    }
                } else {
                    blocked = true;
                    this.isAttacking = true;
                    this.target = towerAhead;
                }
            }
        }

        // 3. Помощь сородичам
        if (!blocked) {
            const allyAhead = getMonsterInFront(this, allMonsters);
            if (allyAhead && allyAhead.isAttacking && allyAhead.target) {
                blocked = true;
                this.isAttacking = true;
                this.target = allyAhead.target;
            }
        }

        if (!blocked) {
            this.isAttacking = false;
            this.x -= this.speed * (dT / 16);
        } else {
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
            // Если это анимационная лента (ширина больше высоты)
            if (img.width > img.height) {
                const frameWidth = img.width / this.frameCount;
                const frameHeight = img.height;
                const sx = this.animFrame * frameWidth;

                ctx.drawImage(
                    img, 
                    sx, 0, frameWidth, frameHeight,              // Откуда вырезаем кадр
                    this.x - size / 2, this.y - size / 2, size, size // Куда рисуем на карту
                );
            } else {
                // Обычная статичная картинка
                ctx.drawImage(img, this.x - size / 2, this.y - size / 2, size, size);
            }
        } else {
            // Резервный цветной кружок, если картинка не загрузилась
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
