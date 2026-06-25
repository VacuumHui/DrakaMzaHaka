export const assets = {
    images: {}
};

// Прописываем пути к картинкам
const imageSources = {
    background: 'assets/images/background.png', // Наш новый красивый фон
    wall: 'assets/images/wall.png',
    tower_archer: 'assets/images/tower_archer.png',
    barricade: 'assets/images/barricade.png',
    monster_goblin: 'assets/images/monster_goblin.png',
    monster_orc: 'assets/images/monster_orc.png',
    arrow: 'assets/images/arrow.png'
};

export function loadAllAssets(onProgress, onComplete) {
    const keys = Object.keys(imageSources);
    const totalImages = keys.length;
    let loadedImages = 0;

    if (totalImages === 0) {
        onComplete();
        return;
    }

    keys.forEach(key => {
        const img = new Image();
        img.src = imageSources[key];
        img.onload = () => {
            assets.images[key] = img;
            loadedImages++;
            if (onProgress) onProgress(loadedImages / totalImages, key);
            if (loadedImages === totalImages) {
                onComplete();
            }
        };
        img.onerror = () => {
            console.warn(`Файл ${imageSources[key]} не найден. Создана временная заглушка.`);
            const fallbackCanvas = document.createElement('canvas');
            fallbackCanvas.width = 48;
            fallbackCanvas.height = 48;
            assets.images[key] = fallbackCanvas;
            
            loadedImages++;
            if (loadedImages === totalImages) {
                onComplete();
            }
        };
    });
}
