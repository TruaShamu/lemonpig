import * as THREE from 'three';
import { CONFIG } from './config.js';
import { drawingCanvas } from './canvas.js';

export const lemonTexture = new THREE.CanvasTexture(drawingCanvas);
lemonTexture.colorSpace = THREE.SRGBColorSpace;

export const lemonMaterial = new THREE.MeshStandardMaterial({
    map: lemonTexture,
    roughness: 0.5,
    metalness: 0.1,
    bumpMap: lemonTexture,
    bumpScale: 0.015
});

export const fleshMaterial = new THREE.MeshStandardMaterial({ color: 0xfffee0, roughness: 0.8 });
export const legMat = new THREE.MeshStandardMaterial({ color: CONFIG.toothpickColor, roughness: 0.8 });
export const coinMat = new THREE.MeshStandardMaterial({ color: CONFIG.coinColor, roughness: 0.3, metalness: 0.9 });
