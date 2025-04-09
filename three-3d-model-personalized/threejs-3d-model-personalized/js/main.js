import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const manager = new THREE.LoadingManager();

let camera, scene, renderer, stats, object, loader, guiMorphsFolder;
let mixer, currentAction;  // Added currentAction to track current animation

const clock = new THREE.Clock();

// Added animation key mapping - CHANGE 1
const animationKeys = {
    '1': 'Female Walk.fbx',
    '2': 'Catwalk Walk Forward Turn 90L.fbx',
    '3': 'Catwalk Walk Start Turn 180 Right.fbx',
    '4': 'Female Locomotion Pose.fbx',
    '5': 'Female Stop Walking.fbx'
};

const params = {
     // Set default animation
};

const assets = [
    'Female Walk.fbx',
    'Catwalk Walk Forward Turn 90L.fbx',
    'Catwalk Walk Start Turn 180 Right.fbx',
    'Female Locomotion Poses.fbx',
    'Female Stop Walking.fbx'
];

init();

function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(100, 200, 300);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 5);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 5);
    dirLight.position.set(0, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 180;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.camera.left = -120;
    dirLight.shadow.camera.right = 120;
    scene.add(dirLight);

    // ground
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }));
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);
    
    loader = new FBXLoader(manager);
    loadAsset(params.asset);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 100, 0);
    controls.update();

    window.addEventListener('resize', onWindowResize);
    
    // Added keyboard event listener - CHANGE 2
    window.addEventListener('keydown', onKeyDown);

    // stats
    stats = new Stats();
    container.appendChild(stats.dom);

    const gui = new GUI();
    gui.add(params, 'asset', assets).onChange(function(value) {
        loadAsset(value);
    });

    guiMorphsFolder = gui.addFolder('Morphs').hide();
}

// Added keyboard control function - CHANGE 3
function onKeyDown(event) {
    if (animationKeys[event.key]) {
        params.asset = animationKeys[event.key];
        loadAsset(animationKeys[event.key]);
    }
}

// Cambios en la función loadAsset
function loadAsset(asset) {
    console.log('Cargando asset:', asset);

    // Limpiar la escena y recursos antes de cargar el nuevo modelo
    if (object) {
        // Limpiar animaciones anteriores
        if (mixer) {
            mixer.stopAllAction();
            mixer.uncacheRoot(object);
            mixer = null;
        }

        // Limpiar objetos y recursos
        object.traverse(function(child) {
            if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(material => {
                    if (material.map) material.map.dispose();
                    material.dispose();
                });
            }
            if (child.geometry) child.geometry.dispose();
        });
        scene.remove(object);
        object = null;
    }

    loader.load('models/fbx/' + asset, function(group) {
        object = group;

        // Configurar animaciones
        if (object.animations && object.animations.length > 0) {
            mixer = new THREE.AnimationMixer(object);
            
            // Detener cualquier acción anterior
            if (currentAction) {
                currentAction.stop();
                currentAction = null;
            }
            
            // Crear y reproducir nueva acción
            currentAction = mixer.clipAction(object.animations[0]);
            currentAction.reset();
            currentAction.setEffectiveTimeScale(1.0);
            currentAction.setEffectiveWeight(1.0);
            currentAction.play();
        } else {
            mixer = null;
        }

        // Configurar GUI de morph targets
        guiMorphsFolder.children.forEach((child) => child.destroy());
        guiMorphsFolder.hide();

        object.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                if (child.morphTargetDictionary) {
                    guiMorphsFolder.show();
                    const meshFolder = guiMorphsFolder.addFolder(child.name || child.uuid);
                    Object.keys(child.morphTargetDictionary).forEach((key) => {
                        meshFolder.add(child.morphTargetInfluences, child.morphTargetDictionary[key], 0, 1, 0.01);
                    });
                }
            }
        });

        scene.add(object);

    }, undefined, function(error) {
        console.error('Error al cargar el modelo:', error);
    });
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    renderer.render(scene, camera);
    stats.update();
}