import * as THREE from 'three';
import { CONFIG } from './config.js';

export function createCloveMesh(scaleVal = 1.0) {
    const g = new THREE.Group();
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.25), new THREE.MeshStandardMaterial({ color: CONFIG.cloveColor }));
    stalk.rotation.x = Math.PI/2;
    stalk.position.z = -0.125;
    g.add(stalk);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), new THREE.MeshStandardMaterial({ color: CONFIG.cloveColor }));
    g.add(bulb);
    const sepalGeo = new THREE.ConeGeometry(0.02, 0.08, 8);
    sepalGeo.translate(0, 0.04, 0);
    for(let i=0; i<4; i++) {
        const s = new THREE.Mesh(sepalGeo, new THREE.MeshStandardMaterial({ color: CONFIG.cloveColor }));
        s.rotation.z = (Math.PI/2) * i;
        s.rotateX(0.3);
        g.add(s);
    }
    g.scale.set(scaleVal, scaleVal, scaleVal);
    return g;
}

export function createCoinMesh(material) {
    const geo = new THREE.CylinderGeometry(0.25, 0.25, 0.02, 32); 
    const coin = new THREE.Mesh(geo, material);
    return coin;
}

export function createFortuneSprite(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 256;
    
    // Card style
    ctx.fillStyle = "white";
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 10;
    ctx.roundRect(10, 10, 492, 236, 20);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = "#ca8a04"; // Darker yellow/gold
    ctx.font = "bold 40px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🍋 LEMON ORACLE 🍋", 256, 50);

    // Body Text
    ctx.fillStyle = "#854d0e";
    ctx.font = "bold 26px 'Segoe UI', sans-serif";
    
    // Wrap text
    const words = text.split(' ');
    let line = '';
    let lines = [];
    for(let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > 450 && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    // Center lines vertically in the remaining space (below title)
    // Available height approx 256 - 80 = 176. Center around 168.
    let startY = 150 - (lines.length * 15);
    for(let i=0; i<lines.length; i++) {
        ctx.fillText(lines[i], 256, startY + (i*35));
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 1, 1);
    return sprite;
}
