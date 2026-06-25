export class Projectile {
    constructor(startX, startY, target, config) {
        this.x = startX;
        this.y = startY;
        this.target = target;
        this.config = config; // Конфиг башни
        this.speed = 6;
        this.active = true;
    }

    update(dT, monsters) {
        if (!this.target || this.target.health <= 0) {
            this.active = false;
            return;
        }

        const dX = this.target.x - this.x;
        const dY = this.target.y - this.y;
        const dist = Math.sqrt(dX * dX + dY * dY);

        if (dist < this.speed * (dT / 16)) {
            // Попадание
            this.hit(monsters);
            this.active = false;
        } else {
            this.x += (dX / dist) * this.speed * (dT / 16);
            this.y += (dY / dist) * this.speed * (dT / 16);
        }
    }

    hit(monsters) {
        if (this.config.isSplash) {
            // Магический взрыв по площади
            for (let m of monsters) {
                if (m.health <= 0) continue;
                const dist = Math.sqrt((m.x - this.x) ** 2 + (m.y - this.y) ** 2);
                if (dist <= this.config.splashRadius) {
                    m.health -= this.config.damage;
                }
            }
        } else {
            // Одиночное попадание стрелы
            if (this.target && this.target.health > 0) {
                this.target.health -= this.config.damage;
            }
        }
    }

    draw(ctx, images) {
        if (!this.active) return;
        const img = images.arrow;

        if (img && img.width > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            // Базовый поворот снаряда к цели
            if (this.target) {
                const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                ctx.rotate(angle);
            }
            ctx.drawImage(img, -8, -4, 16, 8);
            ctx.restore();
        } else {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
