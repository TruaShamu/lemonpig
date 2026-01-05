import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { CONFIG, FORTUNES } from './config.js';
import { state, trackers } from './state.js';
import { ctx, initTexture } from './canvas.js';
import { lemonTexture, lemonMaterial, fleshMaterial, legMat, coinMat } from './materials.js';
import { createCloveMesh, createCoinMesh, createFortuneSprite } from './helpers.js';
import { ConfettiSystem } from './confetti.js';

// --- Undo/Redo System ---
class HistoryManager {
    constructor() {
        this.stacks = {
            prep: { undo: [], redo: [] },
            legs: { undo: [], redo: [] },
            ears: { undo: [], redo: [] },
            face: { undo: [], redo: [] },
            decor: { undo: [], redo: [] },
            celebrate: { undo: [], redo: [] }
        };
    }

    get currentStack() { return this.stacks[state.stages[state.stageIndex]]; }

    pushAction(action) {
        this.currentStack.undo.push(action);
        this.currentStack.redo = []; 
        updateHistoryUI();
    }

    undo() {
        const stack = this.currentStack;
        if (stack.undo.length === 0) return;
        const action = stack.undo.pop();
        stack.redo.push(action);
        this.applyUndo(action);
        updateHistoryUI();
    }

    redo() {
        const stack = this.currentStack;
        if (stack.redo.length === 0) return;
        const action = stack.redo.pop();
        stack.undo.push(action);
        this.applyRedo(action);
        updateHistoryUI();
    }

    applyUndo(action) {
        switch(action.type) {
            case 'add': 
                action.parent.remove(action.mesh);
                if(action.mesh === trackers.lastPlacedEar) trackers.lastPlacedEar = null;
                if(action.mesh === trackers.lastPlacedCoin) trackers.lastPlacedCoin = null;
                break;
            case 'toggle': setToggleState(action.key, action.previousValue); break;
            case 'draw': ctx.putImageData(action.previousData, 0, 0); lemonTexture.needsUpdate = true; break;
        }
    }

    applyRedo(action) {
        switch(action.type) {
            case 'add': 
                action.parent.add(action.mesh); 
                if(action.parent === earsContainer) trackers.lastPlacedEar = action.mesh;
                if(action.parent === coinsContainer) trackers.lastPlacedCoin = action.mesh;
                break;
            case 'toggle': setToggleState(action.key, action.newValue); break;
            case 'draw': ctx.putImageData(action.newData, 0, 0); lemonTexture.needsUpdate = true; break;
        }
    }
}
const history = new HistoryManager();

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.backgroundColor);
scene.fog = new THREE.Fog(CONFIG.backgroundColor, CONFIG.fogNear, CONFIG.fogFar);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(CONFIG.cameraPosition.x, CONFIG.cameraPosition.y, CONFIG.cameraPosition.z);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.SoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(CONFIG.ambientLightColor, CONFIG.ambientLightIntensity);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(CONFIG.dirLightColor, CONFIG.dirLightIntensity);
dirLight.position.set(CONFIG.dirLightPosition.x, CONFIG.dirLightPosition.y, CONFIG.dirLightPosition.z);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);
const backLight = new THREE.DirectionalLight(CONFIG.backLightColor, CONFIG.backLightIntensity);
backLight.position.set(CONFIG.backLightPosition.x, CONFIG.backLightPosition.y, CONFIG.backLightPosition.z);
scene.add(backLight);

// --- Lemon Construction ---
initTexture(); // Initialize texture on canvas

const lemonGroup = new THREE.Group();
scene.add(lemonGroup);

const bodyGeo = new THREE.SphereGeometry(1, 64, 64);
bodyGeo.scale(CONFIG.lemonBodyScale.x, CONFIG.lemonBodyScale.y, CONFIG.lemonBodyScale.z);
const lemonBody = new THREE.Mesh(bodyGeo, lemonMaterial);
lemonBody.castShadow = true;
lemonBody.receiveShadow = true;
lemonBody.name = "lemonBody";
lemonGroup.add(lemonBody);

const backPedicel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.05, 0.3, 16).rotateZ(Math.PI/2).translate(-1.45,0,0), lemonMaterial);
lemonGroup.add(backPedicel);

const frontPedicel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.3, 16).rotateZ(Math.PI/2).translate(1.45,0,0), lemonMaterial);
lemonGroup.add(frontPedicel);

const snoutCut = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32).rotateY(Math.PI/2).translate(1.35,0,0), fleshMaterial);
snoutCut.visible = false;
lemonGroup.add(snoutCut);

const snoutRing = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.22, 32).rotateY(Math.PI/2).translate(1.351,0,0), new THREE.MeshBasicMaterial({color: 0xffffff}));
snoutRing.visible = false;
lemonGroup.add(snoutRing);

class TailCurve extends THREE.Curve {
    getPoint(t, optionalTarget = new THREE.Vector3()) {
        const tx = t * 1; 
        const ty = Math.sin(t * Math.PI * 4) * 0.2;
        const tz = Math.cos(t * Math.PI * 4) * 0.2;
        return optionalTarget.set(tx, ty, tz).multiplyScalar(0.6);
    }
}
const tailMesh = new THREE.Mesh(
    new THREE.TubeGeometry(new TailCurve(), 20, 0.03, 8, false),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.9, side: THREE.DoubleSide })
);
tailMesh.position.set(CONFIG.tailPosition.x, CONFIG.tailPosition.y, CONFIG.tailPosition.z);
tailMesh.rotation.y = Math.PI;
tailMesh.castShadow = true;
tailMesh.visible = false;
lemonGroup.add(tailMesh);

const legsContainer = new THREE.Group();
lemonGroup.add(legsContainer);
const eyesContainer = new THREE.Group();
lemonGroup.add(eyesContainer);
const earsContainer = new THREE.Group();
lemonGroup.add(earsContainer);
const coinsContainer = new THREE.Group();
lemonGroup.add(coinsContainer);
const fortuneContainer = new THREE.Group();
scene.add(fortuneContainer);

const previewMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.04, 0.06, 32),
    new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
);
previewMesh.visible = false;
scene.add(previewMesh);

const confetti = new ConfettiSystem(scene);


// --- Interaction Logic ---
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let isDragging = false;
const instructionsDiv = document.getElementById('instructions');
const toastDiv = document.getElementById('toast');

function updateInstructions(text) {
    instructionsDiv.innerText = text;
    instructionsDiv.style.opacity = text ? '1' : '0';
}

function showToast(text) {
    toastDiv.innerText = text;
    toastDiv.style.opacity = '1';
    setTimeout(() => { toastDiv.style.opacity = '0'; }, 3000);
}

function alignToNormal(object, position, normal) {
    object.position.copy(position);
    if (state.currentTool === 'leg') object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    else if (state.currentTool === 'eye') object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    else if (state.currentTool === 'ear') object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
}

const dom = renderer.domElement;
function getPointer(event) {
    return {
        x: ( event.clientX / window.innerWidth ) * 2 - 1,
        y: - ( event.clientY / window.innerHeight ) * 2 + 1
    };
}

let mouseDownPos = new THREE.Vector2();

dom.addEventListener('pointerdown', (e) => {
    mouseDownPos.set(e.clientX, e.clientY);
    if (state.currentTool === 'draw' && state.drawMode === 'draw') isDragging = true;
});

dom.addEventListener('pointerup', (e) => {
    isDragging = false;
    
    // If mouse moved significantly, treat as drag (camera move) and ignore click
    if (mouseDownPos.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 5) return;

    // Interaction Check (Tool vs Tail Click)
    if (state.currentTool && state.currentTool !== 'draw') {
        placeObject(e);
    } else if (!state.currentTool) {
        // No tool selected (e.g. Celebrate stage) -> Check for interactions
        checkInteractions(e);
    }
});

dom.addEventListener('pointermove', (e) => {
    const p = getPointer(e);
    pointer.set(p.x, p.y);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(lemonBody);

    // Show preview for all placement tools
    if (['leg', 'eye', 'ear', 'coin'].includes(state.currentTool) && intersects.length > 0) {
        previewMesh.visible = true;
        const hit = intersects[0];
        const normal = hit.face.normal.clone().transformDirection(lemonBody.matrixWorld).normalize();
        previewMesh.position.copy(hit.point).add(normal.multiplyScalar(0.01));
        previewMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    } else {
        previewMesh.visible = false;
    }

    if (state.currentTool === 'draw' && isDragging) handleDrawing(intersects);
});

function checkInteractions(event) {
    const p = getPointer(event);
    pointer.set(p.x, p.y);
    raycaster.setFromCamera(pointer, camera);
    
    // Check tail intersection
    const tailIntersects = raycaster.intersectObject(tailMesh);
    if (tailIntersects.length > 0) {
        // Tail Clicked!
        showToast("You yank the tinfoil tail... the Citrus Oracle awakens!");
        
        // Clear old fortune
        fortuneContainer.clear();
        
        // Get Random Fortune
        const text = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
        
        // Create Card
        const sprite = createFortuneSprite(text);
        sprite.position.set(0, 1.8, 0); // Float lower (was 2.5)
        fortuneContainer.add(sprite);
        trackers.activeFortuneSprite = sprite;
        
        // Simple animation
        let t = 0;
        function float() {
            if(!trackers.activeFortuneSprite) return;
            t += 0.05;
            trackers.activeFortuneSprite.position.y = 1.8 + Math.sin(t) * 0.1;
            requestAnimationFrame(float);
        }
        float();
    }
}

function placeObject(event) {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(lemonBody);
    
    if (intersects.length > 0) {
        const hit = intersects[0];
        const point = hit.point;
        const normal = hit.face.normal.clone().transformDirection(lemonBody.matrixWorld).normalize();

        let meshToAdd = null;
        let parentContainer = null;

        if (state.currentTool === 'leg') {
            const geo = new THREE.CylinderGeometry(0.02, 0.02, parseFloat(state.legLength), 8);
            geo.translate(0, parseFloat(state.legLength)/2, 0); 
            const leg = new THREE.Mesh(geo, legMat);
            alignToNormal(leg, point, normal);
            leg.translateY(-0.1); leg.castShadow = true;
            meshToAdd = leg; parentContainer = legsContainer;
        } 
        else if (state.currentTool === 'eye') {
            const eye = createCloveMesh(parseFloat(state.cloveSize));
            alignToNormal(eye, point, normal);
            eye.castShadow = true;
            meshToAdd = eye; parentContainer = eyesContainer;
        }
        else if (state.currentTool === 'ear' && state.customEarGeometry) {
            const ear = new THREE.Mesh(state.customEarGeometry, lemonMaterial);
            alignToNormal(ear, point, normal);
            ear.userData.baseQuaternion = ear.quaternion.clone();
            ear.rotateX(THREE.MathUtils.degToRad(-state.earLift)); 
            ear.translateZ(-0.05); 
            ear.castShadow = true;
            meshToAdd = ear; parentContainer = earsContainer;
            trackers.lastPlacedEar = ear;
        }
        else if (state.currentTool === 'coin') {
            const coin = createCoinMesh(coinMat);
            coin.position.copy(point); 
            coin.position.y -= 0.01; 
            const rotRad = (state.coinAngle * Math.PI) / 180;
            coin.rotation.x = rotRad;
            coin.castShadow = true;
            meshToAdd = coin; parentContainer = coinsContainer;
            trackers.lastPlacedCoin = coin;
        }

        if (meshToAdd && parentContainer) {
            parentContainer.add(meshToAdd);
            history.pushAction({ type: 'add', mesh: meshToAdd, parent: parentContainer });
            
            const originalScale = meshToAdd.scale.clone();
            meshToAdd.scale.set(0,0,0);
            let s = 0;
            function pop() {
                s += 0.1;
                if(s <= 1.2) {
                    meshToAdd.scale.copy(originalScale).multiplyScalar(s > 1 ? 1 + (1.2-s) : s);
                    requestAnimationFrame(pop);
                } else { meshToAdd.scale.copy(originalScale); }
            }
            pop();
        }
    }
}

// --- Drawing ---
let lastUV = null;
let preDrawState = null;
let isDrawingActionActive = false;

dom.addEventListener('pointerdown', (e) => {
    if (state.currentTool === 'draw' && state.drawMode === 'draw') {
        isDrawingActionActive = true;
        preDrawState = ctx.getImageData(0, 0, CONFIG.textureSize, CONFIG.textureSize);
        lastUV = null;
        const intersects = raycaster.intersectObject(lemonBody);
        if(intersects.length > 0) handleDrawing(intersects);
    }
});

dom.addEventListener('pointerup', () => {
    if (state.currentTool === 'draw' && isDrawingActionActive) {
        const postDrawState = ctx.getImageData(0, 0, CONFIG.textureSize, CONFIG.textureSize);
        history.pushAction({ type: 'draw', previousData: preDrawState, newData: postDrawState });
        isDrawingActionActive = false;
        lastUV = null;
    }
});

function handleDrawing(intersects) {
    if (intersects.length > 0) {
        const uv = intersects[0].uv;
        if (uv) {
            const x = uv.x * CONFIG.textureSize;
            const y = (1 - uv.y) * CONFIG.textureSize;
            ctx.lineWidth = state.brushSize * 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = state.brushColor;
            ctx.fillStyle = state.brushColor;
            ctx.beginPath();
            if (lastUV) {
                const lastX = lastUV.x * CONFIG.textureSize;
                const lastY = (1 - lastUV.y) * CONFIG.textureSize;
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
            } else {
                ctx.arc(x, y, state.brushSize, 0, 2 * Math.PI);
                ctx.fill();
            }
            lastUV = uv;
            lemonTexture.needsUpdate = true;
        }
    } else { lastUV = null; }
}

// --- UI & State Logic ---

function updateStageUI() {
    const currentStageName = state.stages[state.stageIndex];
    
    // Dots
    const dotsContainer = document.getElementById('stage-dots');
    dotsContainer.innerHTML = '';
    state.stages.forEach((s, i) => {
        const d = document.createElement('div');
        d.className = `dot ${i === state.stageIndex ? 'active' : ''}`;
        dotsContainer.appendChild(d);
    });

    // Panes
    document.querySelectorAll('.stage-pane').forEach(el => el.classList.remove('active'));
    document.getElementById(`stage-${currentStageName}`).classList.add('active');

    // Nav
    document.getElementById('prev-stage').disabled = state.stageIndex === 0;
    const nextBtn = document.getElementById('next-stage');
    nextBtn.disabled = state.stageIndex === state.stages.length - 1;
    nextBtn.style.opacity = state.stageIndex === state.stages.length - 1 ? 0 : 1;

    // Handle Celebration Stage Trigger
    if (currentStageName === 'celebrate') {
        confetti.start();
        updateInstructions("✨ Enjoy your creation! ✨");
        document.getElementById('ui-container').classList.remove('collapsed');
    } else {
        confetti.reset();
    }

    // Reset tools
    setActiveTool(null);
    updateHistoryUI();
}

function updateHistoryUI() {
    const stack = history.currentStack;
    document.getElementById('btn-undo').disabled = stack.undo.length === 0;
    document.getElementById('btn-redo').disabled = stack.redo.length === 0;
}

// Landing Page Start
document.getElementById('btn-start').onclick = () => {
    document.getElementById('landing-page').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('landing-page').style.display = 'none';
        document.getElementById('ui-container').style.display = 'flex';
        document.getElementById('bottom-bar').style.display = 'flex';
        document.getElementById('menu-toggle').style.display = 'flex';
        document.getElementById('info-btn').style.display = 'flex';
        document.getElementById('history-container').style.display = 'flex';
    }, 500);
};

// Navigation Events
document.getElementById('prev-stage').onclick = () => { if(state.stageIndex > 0) { state.stageIndex--; updateStageUI(); } };
document.getElementById('next-stage').onclick = () => { if(state.stageIndex < state.stages.length-1) { state.stageIndex++; updateStageUI(); } };
document.getElementById('btn-finish').onclick = () => { 
    state.stageIndex = state.stages.indexOf('celebrate'); 
    updateStageUI(); 
};

// Menu Toggle
document.getElementById('menu-toggle').onclick = () => {
    document.getElementById('ui-container').classList.toggle('collapsed');
};

// Info Modal
document.getElementById('info-btn').onclick = () => document.getElementById('info-modal').style.display = 'flex';
document.getElementById('close-info').onclick = () => document.getElementById('info-modal').style.display = 'none';

function setToggleState(key, val) {
    state[key] = val;
    if(key === 'snoutCut') {
        document.getElementById('toggle-snout').checked = val;
        frontPedicel.visible = !val;
        snoutCut.visible = val;
        snoutRing.visible = val;
    } else if (key === 'tailVisible') {
        document.getElementById('toggle-tail').checked = val;
        tailMesh.visible = val;
    }
}

function setActiveTool(toolName, btnId) {
    document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
    if(state.snoutCut) document.getElementById('toggle-snout')?.classList.add('active');
    if(state.tailVisible) document.getElementById('toggle-tail')?.classList.add('active');

    document.getElementById('draw-options').classList.add('hidden');
    previewMesh.visible = false;
    controls.enabled = true; // Default to allow pan

    if (state.currentTool === toolName && toolName !== null) {
        state.currentTool = null;
        updateInstructions("");
        return;
    }

    state.currentTool = toolName;
    if(btnId) document.getElementById(btnId).classList.add('active');

    if (toolName === 'leg') updateInstructions("Click to place leg");
    if (toolName === 'eye') updateInstructions("Click to place eye");
    if (toolName === 'ear') updateInstructions("Click to place ear");
    if (toolName === 'coin') updateInstructions("Click to insert coin");
    if (toolName === 'draw') {
        setDrawMode(state.drawMode);
        document.getElementById('draw-options').classList.remove('hidden');
    }
}

// Draw Mode Switcher
function setDrawMode(mode) {
    state.drawMode = mode;
    document.getElementById('mode-draw').classList.toggle('selected', mode === 'draw');
    document.getElementById('mode-move').classList.toggle('selected', mode === 'move');
    
    if (mode === 'draw') {
        controls.enabled = false;
        updateInstructions("Click & drag to draw");
    } else {
        controls.enabled = true;
        updateInstructions("Pan/Rotate camera to view");
    }
}

document.getElementById('mode-draw').onclick = () => setDrawMode('draw');
document.getElementById('mode-move').onclick = () => setDrawMode('move');

// -- Bindings --
document.getElementById('toggle-snout').onchange = (e) => {
    const newVal = e.target.checked;
    const oldVal = !newVal;
    history.pushAction({ type: 'toggle', key: 'snoutCut', previousValue: oldVal, newValue: newVal });
    setToggleState('snoutCut', newVal);
};
document.getElementById('toggle-tail').onchange = (e) => {
    const newVal = e.target.checked;
    const oldVal = !newVal;
    history.pushAction({ type: 'toggle', key: 'tailVisible', previousValue: oldVal, newValue: newVal });
    setToggleState('tailVisible', newVal);
};
document.getElementById('tool-leg').onclick = () => setActiveTool('leg', 'tool-leg');
document.getElementById('leg-length').oninput = (e) => {
    state.legLength = e.target.value;
    document.getElementById('leg-len-val').innerText = state.legLength;
};
document.getElementById('tool-ear').onclick = () => setActiveTool('ear', 'tool-ear');

// Live Ear Lift
document.getElementById('ear-lift').oninput = (e) => {
    state.earLift = e.target.value;
    document.getElementById('ear-lift-val').innerText = state.earLift + "°";
    if (trackers.lastPlacedEar) {
        trackers.lastPlacedEar.quaternion.copy(trackers.lastPlacedEar.userData.baseQuaternion);
        trackers.lastPlacedEar.rotateX(THREE.MathUtils.degToRad(-state.earLift));
    }
};

document.getElementById('tool-eye').onclick = () => setActiveTool('eye', 'tool-eye');
document.getElementById('tool-coin').onclick = () => setActiveTool('coin', 'tool-coin');

// Coin Rotation Slider
document.getElementById('coin-rotation').oninput = (e) => {
    state.coinAngle = parseInt(e.target.value);
    document.getElementById('coin-rot-val').innerText = state.coinAngle + "°";
    if (trackers.lastPlacedCoin) {
        const rotRad = (state.coinAngle * Math.PI) / 180;
        trackers.lastPlacedCoin.rotation.x = rotRad;
    }
};

document.getElementById('clove-size').oninput = (e) => {
    state.cloveSize = e.target.value;
    document.getElementById('clove-size-val').innerText = state.cloveSize;
};
document.getElementById('tool-draw').onclick = () => setActiveTool('draw', 'tool-draw');

// Share / Save
document.getElementById('take-photo').onclick = () => {
    renderer.render(scene, camera);
    const link = document.createElement('a');
    link.download = 'lemon-pig.png';
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
};
document.getElementById('share-btn').onclick = async () => {
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], "lemon-pig.png", { type: "image/png" });
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: 'My Lemon Pig',
                text: 'Look at this lucky Lemon Pig I made! 🍋🐷'
            });
        } catch (error) { console.log('Sharing failed', error); }
    } else {
        alert("Sharing not supported on this device/browser. Photo downloaded instead!");
        document.getElementById('take-photo').click();
    }
};

// History
document.getElementById('btn-undo').onclick = () => history.undo();
document.getElementById('btn-redo').onclick = () => history.redo();
window.addEventListener('keydown', (e) => {
    if((e.metaKey || e.ctrlKey) && e.key === 'z') history.undo();
    if((e.metaKey || e.ctrlKey) && e.key === 'y') history.redo();
});

// Color Picker
document.querySelectorAll('.color-dot').forEach(dot => {
    dot.onclick = (e) => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
        e.target.classList.add('selected');
        state.brushColor = e.target.dataset.color;
        state.brushSize = state.brushColor === '#ffffff' ? 20 : 5;
    };
});

document.getElementById('custom-color-picker').oninput = (e) => {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    state.brushColor = e.target.value;
    state.brushSize = 5;
};

document.getElementById('btn-eraser').onclick = function() {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    state.brushColor = '#ffea00';
    state.brushSize = 20; 
};

// Ear Editor
const earModal = document.getElementById('ear-modal');
const earCanvas = document.getElementById('ear-canvas');
const earCtx = earCanvas.getContext('2d');
let earPoints = [];
let isDrawingEar = false;

document.getElementById('open-ear-editor').onclick = () => {
    earModal.style.display = 'flex';
    earCtx.clearRect(0, 0, 300, 300);
    earCtx.fillStyle = '#fafafa'; earCtx.fillRect(0,0,300,300);
    earCtx.strokeStyle = '#eab308'; earCtx.lineWidth = 3; earPoints = [];
};
document.getElementById('cancel-ear').onclick = () => earModal.style.display = 'none';

// Mouse/Touch Events for Ear
const handleEarStart = (x, y) => {
    isDrawingEar = true; earPoints = [];
    earCtx.beginPath(); earCtx.moveTo(x, y);
    earPoints.push({x, y});
};
const handleEarMove = (x, y) => {
    if(!isDrawingEar) return;
    earCtx.lineTo(x, y); earCtx.stroke();
    earPoints.push({x, y});
};
const handleEarEnd = () => {
    isDrawingEar = false; earCtx.closePath();
    earCtx.fillStyle = "rgba(234, 179, 8, 0.5)"; earCtx.fill(); earCtx.stroke();
};

earCanvas.onmousedown = (e) => {
    const r = earCanvas.getBoundingClientRect();
    handleEarStart(e.clientX - r.left, e.clientY - r.top);
};
earCanvas.onmousemove = (e) => {
    const r = earCanvas.getBoundingClientRect();
    handleEarMove(e.clientX - r.left, e.clientY - r.top);
};
earCanvas.onmouseup = handleEarEnd;

earCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const r = earCanvas.getBoundingClientRect();
    const t = e.touches[0];
    handleEarStart(t.clientX - r.left, t.clientY - r.top);
}, {passive:false});
earCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const r = earCanvas.getBoundingClientRect();
    const t = e.touches[0];
    handleEarMove(t.clientX - r.left, t.clientY - r.top);
}, {passive:false});
earCanvas.addEventListener('touchend', (e) => {
    e.preventDefault(); handleEarEnd();
}, {passive:false});

document.getElementById('save-ear').onclick = () => {
    if (earPoints.length < 3) { alert("Draw a shape first!"); return; }
    const shape = new THREE.Shape();
    const cx = 150, cy = 150, scale = 0.01;
    shape.moveTo((earPoints[0].x - cx) * scale, -(earPoints[0].y - cy) * scale);
    for (let i = 1; i < earPoints.length; i++) shape.lineTo((earPoints[i].x - cx) * scale, -(earPoints[i].y - cy) * scale);
    shape.closePath();
    const extrudeSettings = { steps: 1, depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 };
    state.customEarGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    state.customEarGeometry.center();
    document.getElementById('tool-ear').disabled = false;
    earModal.style.display = 'none';
    setActiveTool('ear', 'tool-ear');
};

// --- Init ---
updateStageUI();

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    confetti.update();
    renderer.render(scene, camera);
}
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
animate();
