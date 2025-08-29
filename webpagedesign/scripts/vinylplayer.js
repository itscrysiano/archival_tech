// --- Core THREE globals ---
let renderer, clock, camera, scene, mixer;
let loadedModel;
let inMenu = true;

// --- Models ---
const MENU_MODEL  = 'assets/models/vinylPlayer3.glb';       
const VINYL_MODEL = 'assets/models/vinylPlayer3.glb'; 

// --- Single Track ---
const TRACK_URL = 'assets/audio/never-too-much-luther-van.mp3';

// --- Canvas / Clock / Renderer ---
const canvas = document.getElementById('threeContainer');
clock = new THREE.Clock();

renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

// --- Scene / Camera / Controls ---
scene = new THREE.Scene();

camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 10);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

// --- Light ---
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.5));

// --- Audio ---
const listener    = new THREE.AudioListener();
camera.add(listener);
const player      = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();

const bufferCache = new Map();

// Make sure WebAudio can play after first user gesture
window.addEventListener('pointerdown', () => {
  if (listener.context.state !== 'running') listener.context.resume();
}, { once: true });

// --- Helpers ---
function disposeObject3D(obj) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        m.map?.dispose?.();
        m.emissiveMap?.dispose?.();
        m.normalMap?.dispose?.();
        m.dispose?.();
      });
    }
  });
}

function centerModel(root) {
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);
}

// --- Audio control ---
function setAndMaybePlay(buffer, autoplay) {
  if (player.isPlaying && player.source) player.stop();
  player.setBuffer(buffer);
  player.setLoop(false);
  player.setVolume(0.85);

  if (autoplay) {
    if (listener.context.state !== 'running') listener.context.resume();
    player.play();
  }
}

function loadTrack(autoplay = false) {
  if (bufferCache.has(TRACK_URL)) {
    setAndMaybePlay(bufferCache.get(TRACK_URL), autoplay);
  } else {
    audioLoader.load(TRACK_URL, (buffer) => {
      bufferCache.set(TRACK_URL, buffer);
      setAndMaybePlay(buffer, autoplay);
    });
  }
}

// --- Model loading ---
const gltfLoader = new THREE.GLTFLoader();

async function loadModel(path) {
  // remove previous
  if (loadedModel) {
    scene.remove(loadedModel);
    disposeObject3D(loadedModel);
    loadedModel = null;
  }

  return new Promise((resolve, reject) => {
    gltfLoader.load(
      path,
      (gltf) => {
        loadedModel = gltf.scene;
        centerModel(loadedModel);
        scene.add(loadedModel);
        frameObject(loadedModel);


        resolve();
      },
      undefined,
      reject
    );
  });
}

async function loadMenuModel() {
  await loadModel(MENU_MODEL);
  inMenu = true;
}

async function loadVinylModelAndPlay(startPlayback = true) {
  await loadModel(VINYL_MODEL);
  inMenu = false;
  loadTrack(startPlayback);
}

function frameObject(object, fitOffset = 1.2) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // Set controls target
  controls.target.copy(center);
  controls.update();

  // Compute distance from FOV
  const maxSize = Math.max(size.x, size.y, size.z);
  const fitHeightDistance = maxSize / (2 * Math.tan((camera.fov * Math.PI) / 360));
  const fitWidthDistance  = fitHeightDistance / camera.aspect;
  const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance);

  // Move camera on its current direction toward the target
  const dir = new THREE.Vector3()
    .subVectors(camera.position, controls.target)
    .normalize()
    .multiplyScalar(distance);
  camera.position.copy(controls.target).add(dir);

  camera.near = distance / 50;
  camera.far  = distance * 50;
  camera.updateProjectionMatrix();

  // If your model sits on the ground, you can add a slight upward offset here if desired
}


// --- UI wiring ---
function updatePlayPauseIcon() {
  const icon = document.getElementById('playPauseIcon');
  if (!icon) return;
  const playing = !!player.isPlaying;
  // Use the same asset if you don’t have separate icons yet
  icon.src = 'assets/buttons/playpause.png';
  icon.dataset.state = playing ? 'playing' : 'paused';
}

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  // MENU: go back to menu model and pause audio
  $('menuBtn')?.addEventListener('click', async () => {
    await loadMenuModel();
    if (player.isPlaying) player.pause();
    updatePlayPauseIcon();
  });

  // PLAY/PAUSE:
  $('playPauseBtn')?.addEventListener('click', async () => {
    if (inMenu) {
      // From menu → load vinyl and start playing
      await loadVinylModelAndPlay(true);
    } else {
      // Already on vinyl model → toggle audio
      if (!player.buffer) {
        loadTrack(true);
      } else if (player.isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    }
    updatePlayPauseIcon();
  });
});

// --- Keyboard (Space toggles; Arrow keys disabled since no playlist) ---
window.addEventListener('keydown', async (e) => {
  const tag = (e.target && e.target.tagName) || '';
  if (/(INPUT|TEXTAREA|SELECT|BUTTON)/.test(tag)) return;

  if (e.code === 'Space') {
    e.preventDefault();
    if (inMenu) {
      await loadVinylModelAndPlay(true);
    } else {
      if (!player.buffer) {
        loadTrack(true);
      } else if (player.isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    }
    updatePlayPauseIcon();
  }
});

// --- Resize ---
function onWindowResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onWindowResize);

// --- Loop ---
function animate() {
  requestAnimationFrame(animate);
  if (mixer) mixer.update(clock.getDelta());
  renderer.render(scene, camera);
}
animate();

// --- Initial load: show Menu, do NOT autoplay (gesture rules) ---
(async () => {
  await loadMenuModel();
  updatePlayPauseIcon();
})();
