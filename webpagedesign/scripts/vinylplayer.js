let renderer, clock, mixer, camera, scene;
let loadedModel;
let screenMesh;
let clickableButtons = [];
let inMenu = true;   



const MENU_MODEL = 'assets/models/ipodMenu.glb';

const playlist = [
  { url: 'assets/audio/you-rock-my-world.mp3', title: 'You Rock My World', model: 'assets/models/ipodMichael.glb', art: 'assets/screens/rock-my-world-michael-jackson.png' },
  { url: 'assets/audio/crazy-in-love.mp3',      title: 'Crazy in Love',    model: 'assets/models/ipodBeyonce.glb', art:'assets/screens/crazy-in-love-beyonce.png' },
  { url: 'assets/audio/dance-dance.mp3', title: 'Dance Dance', model: 'assets/models/ipodFallout.glb', art:'assets/screens/dance dance-fall out boy.png' },
];
let current = 0;

const canvas = document.getElementById('threeContainer');

// Clock 
clock = new THREE.Clock();

// Renderer
renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

// Scene
scene = new THREE.Scene();

// Camera
camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 10);

// Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

// Lighting
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
scene.add(light);

// Audio 
const listener = new THREE.AudioListener();
camera.add(listener);
const player = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();

// WebAudio
window.addEventListener('pointerdown', () => {
  if (listener.context.state !== 'running') listener.context.resume();
}, { once: true});

const bufferCache = new Map();

function setAndMaybePlay(buffer, autoplay) {
  // stop only if actually playing
  if (player && player.isPlaying && player.source) player.stop();

  player.setBuffer(buffer);
  player.setLoop(false);
  player.setVolume(0.75);

  if (autoplay) {
    if (listener.context.state !== 'running') listener.context.resume();
    player.play();
  }
}

function loadTrack(index, autoplay = false) {
  current = (index + playlist.length) % playlist.length;
  const { url } = playlist[current];

  if (bufferCache.has(url)) {
    setAndMaybePlay(bufferCache.get(url), autoplay);
  } else {
    audioLoader.load(url, (buffer) => {
      bufferCache.set(url, buffer);
      setAndMaybePlay(buffer, autoplay);
    });
  }
}


function nextTrack() { loadTrack(current + 1, true); }
function prevTrack() { loadTrack(current - 1, true); }

// Load model
  const gltfLoader = new THREE.GLTFLoader();

// dispose helpers to avoid leaks when swapping models
function disposeObject3D(obj) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.geometry?.dispose?.();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if (m.map) m.map.dispose?.();
          if (m.emissiveMap) m.emissiveMap.dispose?.();
          if (m.normalMap) m.normalMap.dispose?.();
          m.dispose?.();
        });
      }
    }
  });
}

// Center a model at origin
function centerModel(root) {
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);
}

// try to find a "screen" mesh by common names; fallback to first mesh
function findScreenMesh(root) {
  const candidates = ['imageTexture', 'Screen', 'screen', 'LCD', 'lcd'];
  for (const name of candidates) {
    const node = root.getObjectByName(name);
    if (node) {
      if (node.isMesh) return node;
      let found = null;
      node.traverse((c) => { if (!found && c.isMesh) found = c; });
      if (found) return found;
    }
  }
  let anyMesh = null;
  root.traverse((c) => { if (!anyMesh && c.isMesh) anyMesh = c; });
  return anyMesh; // fallback if nothing named matched
}

function updateScreenTexture(imagePath) {
  if (!imagePath) return;
  const loader = new THREE.TextureLoader();
  loader.load(imagePath, (texture) => {
    if (screenMesh && screenMesh.material) {
      if (!screenMesh.material.map) {
        screenMesh.material.map = texture;
      } else {
        screenMesh.material.map.dispose?.();
        screenMesh.material.map = texture;
      }
      screenMesh.material.needsUpdate = true;
    } else {
      // no dedicated screen; silently ignore
    }
  });
}

// Menu model loader 
async function loadMenuModel() {
  // remove previous model if present
  if (loadedModel) {
    scene.remove(loadedModel);
    disposeObject3D(loadedModel);
    loadedModel = null;
    screenMesh = null;
  }

  return new Promise((resolve, reject) => {
    gltfLoader.load(
      MENU_MODEL,
      (gltf) => {
        loadedModel = gltf.scene;
        centerModel(loadedModel);
        scene.add(loadedModel);

        // rebuild clickable buttons for the menu model
        clickableButtons.length = 0;
        loadedModel.traverse((child) => {
          if (child.name?.toLowerCase().includes('button')) clickableButtons.push(child);
        });

        inMenu = true;
        resolve();
      },
      undefined,
      (err) => reject(err)
    );
  });
}

// Model loader for the songs
function loadModelAtIndex(index) {
  const safeIndex = (index + playlist.length) % playlist.length;
  const { model, art } = playlist[safeIndex];

  // remove previous model if present
  if (loadedModel) {
    scene.remove(loadedModel);
    disposeObject3D(loadedModel);
    loadedModel = null;
    screenMesh = null;
  }

  return new Promise((resolve, reject) => {
    gltfLoader.load(
      model,
      (gltf) => {
        loadedModel = gltf.scene;
        centerModel(loadedModel);
        scene.add(loadedModel);

        // (optional) rebuild button list
        clickableButtons.length = 0;
        loadedModel.traverse((child) => {
          if (child.name?.toLowerCase().includes('button')) clickableButtons.push(child);
        });

        screenMesh = findScreenMesh(loadedModel);
        updateScreenTexture(art);

        resolve();
      },
      undefined,
      (err) => reject(err)
    );
  });
}

// Cycle both model and audio together
async function cycle(delta = 1, autoplayAudio = true) {
  current = (current + delta + playlist.length) % playlist.length;
  await loadModelAtIndex(current);
  inMenu = false;
  loadTrack(current, autoplayAudio);
  updatePPIcon();
}


// PNG buttons UI
function updatePPIcon() {
  const icon = document.getElementById('playPauseIcon');
  if (!icon) return;
  const playing = !!(player && player.isPlaying);
  icon.src = playing ? 'assets/buttons/playpause.png' : 'assets/buttons/playpause.png';
  icon.dataset.state = playing ? 'playing' : 'paused';
}

//Hook up transport buttons once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const byId = (id) => document.getElementById(id);

  byId('menuBtn')?.addEventListener('click', async () => {
    await loadMenuModel();
    if (player.isPlaying) player.pause();
    updatePPIcon();
  });

  byId('menuBtn')     ?.addEventListener('click', () => console.log('Menu'));
  byId('prevBtn')     ?.addEventListener('click', async () => { await cycle(-1, true); });


  byId('playPauseBtn')?.addEventListener('click', async () => {
  if (inMenu) {
    // from menu → load current song’s model and start playing
    await loadModelAtIndex(current);
    inMenu = false;
    loadTrack(current, true);
  } else {
    // already on a song model → just toggle audio
    if (!player.buffer) { 
      loadTrack(current, true); 
    } else if (player.isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }
  updatePPIcon();
});

  byId('nextBtn')     ?.addEventListener('click', async () => { await cycle(+1, true); });
});


// Keyboard
window.addEventListener('keydown', async (e) => {
  // don’t hijack typing in inputs
  const tag = (e.target && e.target.tagName) || '';
  if (/(INPUT|TEXTAREA|SELECT|BUTTON)/.test(tag)) return;

  if (e.code === 'Space') {
    e.preventDefault(); // prevent page from scrolling
    if (inMenu) {
      await loadModelAtIndex(current); // load first song model (current=0 initially)
      inMenu = false;
      loadTrack(current, true);        // start audio
    } else {
      if (!player.buffer) {
        loadTrack(current, true);      // first play on a song model
      } else if (player.isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    }
    updatePPIcon();
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    await cycle(+1, true);
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    await cycle(-1, true);
  }
});


// Raycasting Logic
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableButtons);

  if (intersects.length > 0) {
    const clicked = intersects[0].object;
    const buttonName = clicked.parent.name.toLowerCase();

    switch(buttonName){
      case 'playbutton':
        if (audio.isPlaying) {
          audio.pause();
        } else {
          audio.play();
        }
        break;

      case 'forwardbutton':
        currentTrack = (currentTrack + 1) % songs.length;
        updateScreenTexture(screens[currentTrack]);
        setupAudio(songs[currentTrack]);
        break;

      case 'rewindbutton':
        currentTrack = (currentTrack - 1) % songs.length;
        updateScreenTexture(screens[currentTrack]);
        setupAudio(songs[currentTrack]);
        break;

        default:
          console.warn('Clicked object not assigned a control:', buttonName);
    }
  }
});

// Resize handler
function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// Attach the resize event
window.addEventListener('resize', onWindowResize, false);

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update animation if any
  if (mixer) {
    mixer.update(clock.getDelta());
  }

  renderer.render(scene, camera);
}

// Start the animation loop
animate();

// Initial Load
// Load first model and prepare its audio (no autoplay to respect gesture rules)
(async () => {
  await loadMenuModel();      
})();
