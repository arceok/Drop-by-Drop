function startRainEffect(duration = 2500, dropCount = 90) {
    const rainContainer = document.createElement('div');
    rainContainer.className = 'rain-container';
    document.body.appendChild(rainContainer);

    for (let i = 0; i < dropCount; i++) {
        const drop = document.createElement('span');
        drop.className = 'raindrop-emoji';
        drop.textContent = '💧';
        drop.style.left = `${Math.random() * 100}vw`;
        drop.style.animationDelay = `${Math.random() * 0.8}s`;
        rainContainer.appendChild(drop);
    }

    setTimeout(() => {
        rainContainer.remove();
    }, duration);
}

window.startRainEffect = startRainEffect;
