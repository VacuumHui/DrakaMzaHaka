import { GRID_SIZE } from './map.js';

export const TOWER_TYPES = {
    // НАСТЕННЫЕ БАШНИ (Строятся на колонках 0-1)
    ARCHER: {
        id: 'ARCHER',
        name: 'Лучник',
        cost: 70,
        type: 'wall',
        range: 300,
        damage: 15,
        attackSpeed: 1000, // в миллисекундах
        imageKey: 'tower_archer',
        color: '#f1c40f'
    },
    MAGE: {
        id: 'MAGE',
        name: 'Маг огня',
        cost: 130,
        type: 'wall',
        range: 200,
        damage: 35,
        attackSpeed: 1800,
        imageKey: 'tower_mage',
        color: '#9b59b6',
        isSplash: true,
        splashRadius: 70
    },
    // НАЗЕМНЫЕ ПОСТРОЙКИ (Строятся на колонках 2-18, имеют ХП и могут ломаться)
    BARRICADE: {
        id: 'BARRICADE',
        name: 'Баррикада',
        cost: 30,
        type: 'ground',
        maxHp: 350,
        damage: 0,
        range: 0,
        attackSpeed: 0,
        imageKey: 'barricade',
        color: '#d35400'
    },
    SPIKES: {
        id: 'SPIKES',
        name: 'Шипы',
        cost: 45,
        type: 'ground',
        maxHp: 120,
        damage: 8,
        range: 24, // Ближний радиус (наступает на нее)
        attackSpeed: 1200,
        imageKey: 'spikes',
        color: '#7f8c8d'
    }
};

export class Tower {
    constructor(gridX, gridY, config) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.x = gridX * GRID_SIZE + GRID_SIZE / 2;
        this.y = gridY * GRID_SIZE + GRID_SIZE / 2;
        this.config = config;
        
        this.hp = config.maxHp || 0;
        this.maxHp = config.maxHp || 0;
        
        this.attackCooldown = 0;
    }

    update(dT, monsters, spawnProjectile) {
        if (this.config.damage === 0) return; // Баррикада не атакует

        this.attackCooldown -= dT;
        if (this.attackCooldown <= 0) {
            const target = this.findTarget(monsters);
            if (target) {
                spawnProjectile(this, target);
                this.attackCooldown = this.config.attackSpeed;
            }
        }
    }

    findTarget(monsters) {
        let closest = null;
        let minDist = this.config.range;

        for (let m of monsters) {
            if (m.x < 0 || m.health <= 0) continue;
            const dist = Math.sqrt((m.x - this.x) ** 2 + (m.y - this.y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                closest = m;
            }
        }
        return closest;
    }

    takeDamage(amount) {
        if (this.maxHp > 0) {
            this.hp -= amount;
            return this.hp <= 0; // Возвращает true, если башня уничтожена
        }
        return false;
    }

    draw(ctx, images) {
        const drawX = this.gridX * GRID_SIZE;
        const drawY = this.gridY * GRID_SIZE;
        const img = images[this.config.imageKey];

        // Отрисовка спрайта или цветной заглушки
        if (img && img.width > 0 && img.height > 0) {
            ctx.drawImage(img, drawX, drawY, GRID_SIZE, GRID_SIZE);
        } else {
            ctx.fillStyle = this.config.color;
            ctx.fillRect(drawX + 6, drawY + 6, GRID_SIZE - 12, GRID_SIZE - 12);
        }

        // Полоса здоровья только для наземных ломающихся построек
        if (this.maxHp > 0) {
            const barW = GRID_SIZE * 0.8;
            const barH = 5;
            const barX = drawX + (GRID_SIZE - barW) / 2;
            const barY = drawY + 2;

            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
        }
    }
}
