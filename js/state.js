export const state = {
    stageIndex: 0,
    stages: ['prep', 'legs', 'ears', 'face', 'decor', 'celebrate'],
    currentTool: null, 
    legLength: 0.8,
    cloveSize: 1.0,
    brushColor: '#000000',
    brushSize: 5,
    snoutCut: false,
    tailVisible: false,
    customEarGeometry: null,
    earLift: 30, // Degrees to lift ear
    coinAngle: 0, // 0 = flat, 90 = vertical
    drawMode: 'draw' // 'draw' or 'move'
};

export const trackers = {
    lastPlacedEar: null,
    lastPlacedCoin: null,
    activeFortuneSprite: null
};
