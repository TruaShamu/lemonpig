import { CONFIG } from './config.js';

export const texSize = CONFIG.textureSize;
export const drawingCanvas = document.createElement('canvas');
drawingCanvas.width = texSize;
drawingCanvas.height = texSize;
export const ctx = drawingCanvas.getContext('2d', { willReadFrequently: true });

export function initTexture() {
    ctx.fillStyle = '#' + CONFIG.lemonColor.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, texSize, texSize);
    for(let i=0; i<60000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#ffe100' : '#fff566';
        ctx.fillRect(Math.random()*texSize, Math.random()*texSize, 2, 2);
    }
}
