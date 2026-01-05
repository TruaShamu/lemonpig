import * as THREE from 'three';
import { CONFIG } from './config.js';

export class ConfettiSystem {
    constructor(scene) {
        this.particles = [];
        this.active = false;
        this.group = new THREE.Group();
        scene.add(this.group);
        
        const colors = CONFIG.confettiColors;
        const geometry = new THREE.PlaneGeometry(0.1, 0.05);

        for (let i = 0; i < CONFIG.confettiCount; i++) {
            const material = new THREE.MeshBasicMaterial({ 
                color: colors[Math.floor(Math.random() * colors.length)], 
                side: THREE.DoubleSide 
            });
            const mesh = new THREE.Mesh(geometry, material);
            
            this.particles.push({
                mesh: mesh,
                velocity: new THREE.Vector3(0,0,0),
                rotationSpeed: new THREE.Vector3(0,0,0)
            });
            this.group.add(mesh);
        }
        this.reset();
    }

    reset() {
        this.group.visible = false;
        this.active = false;
        this.particles.forEach(p => { p.mesh.position.set(0, 5, 0); });
    }

    start() {
        this.group.visible = true;
        this.active = true;
        this.particles.forEach(p => {
            p.mesh.position.set((Math.random()-0.5)*4, 4 + Math.random()*2, (Math.random()-0.5)*4);
            p.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.2 + 0.1,
                (Math.random() - 0.5) * 0.2
            );
            p.rotationSpeed = new THREE.Vector3(Math.random()*0.2, Math.random()*0.2, Math.random()*0.2);
        });
    }

    update() {
        if (!this.active) return;
        this.particles.forEach(p => {
            p.mesh.position.add(p.velocity);
            p.mesh.rotation.x += p.rotationSpeed.x;
            p.mesh.rotation.y += p.rotationSpeed.y;
            p.mesh.rotation.z += p.rotationSpeed.z;
            p.velocity.y -= 0.005;
            if (p.mesh.position.y < -3) {
                p.mesh.position.y = 5;
                p.velocity.y = Math.random() * 0.05;
            }
        });
    }
}
