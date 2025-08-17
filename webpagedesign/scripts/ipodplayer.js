let renderer, clock, mixer, camera, scene;
let loadedModel;
let iPod, screenMesh;
let clickableButtons = [];

const playlist = [
   { url: 'assets/audio/you-rock-my-world.mp3', title: 'You Rock My World', art: 'assets/screens/rock-my-world-michael-jackson.png' },
  { url: 'assets/audio/crazy-in-love.mp3',      title: 'Crazy in Love',    art: 'assets/screens/crazy-in-love-beyonce.png' },
  { url: 'assets/audio/dance-dance.mp3', title: 'Dance Dance', art: 'assets/screens/dance dance-fall out boy.png' },
];
let current = 0;

const canvas = document.getElementById('threeContainer');

// Clock for animation (if needed)
clock = new THREE.Clock();

// Set up the renderer
renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

// Create scene
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
camera.add( listener );
const player = new THREE.Audio( listener );
const audioLoader = new THREE.AudioLoader();

//WebAudio user gesture
window.addEventListener('pointerdown',() => {
  if (listener.context.state !== 'running') listener.context.resume();
}, { once: true});

const bufferCache = new Map();

function setAndMaybePlay(buffer, autoplay) {
  if (player && player.buffer) player.stop();
  player.setBuffer(buffer);
  player.setLoop(false);
  player.setVolume(0.75);
  if (autoplay) player.play();
  };

function loadTrack(index, autoplay = false) {
  current = (index + playlist.length) % playlist.length;
  const { url, art } = playlist[current];

  updateScreenTexture(art);

  if (bufferCache.has(url)) {
    setAndMaybePlay(bufferCache.get(url), autoplay);
  } else {
    audioLoader.load(url, (buffer) => {
      bufferCache.set(url, buffer);
      setAndMaybePlay(buffer, autoplay);
    });
  }
}

//Audio Controller
function playPause() {
  if (!player.buffer) return loadTrack(current, true);
  if (player.isPlaying) player.pause(); else player.play();
}
function nextTrack() { loadTrack(current + 1, true); }
function prevTrack() { loadTrack(current - 1, true); }

//Buttons
//document.getElementById('playPauseBtn')?.addEventListener('click', playPause);
//document.getElementById('nextBtn')?.addEventListener('click', nextTrack);
//document.getElementById('prevBtn')?.addEventListener('click', prevTrack);

// UI wiring for PNG buttons 
function updatePPIcon() {
  const icon = document.getElementById('playPauseIcon');
  if (!icon) return;
  const playing = !!(player && player.isPlaying);
  icon.src = playing ? 'assets/buttons/playpause.png' : 'assets/buttons/playpause.png';
  icon.dataset.state = playing ? 'playing' : 'paused';
}

// Hook up transport buttons once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const byId = (id) => document.getElementById(id);

  byId('menuBtn')     ?.addEventListener('click', () => console.log('Menu'));
  byId('prevBtn')     ?.addEventListener('click', () => { prevTrack(); updatePPIcon(); });
  byId('playPauseBtn')?.addEventListener('click', () => { playPause();  updatePPIcon(); });
  byId('nextBtn')     ?.addEventListener('click', () => { nextTrack();  updatePPIcon(); });
});


//Keyboard
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); playPause(); }
  if (e.code === 'ArrowRight') nextTrack();
  if (e.code === 'ArrowLeft') prevTrack();
})


// Load model
  const loader = new THREE.GLTFLoader();
  loader.load(
    'assets/models/ipodMenu.glb',
    function(gltf) {
      loadedModel = gltf.scene;

    const box = new THREE.Box3().setFromObject(loadedModel);
    const center = box.getCenter(new THREE.Vector3());
    loadedModel.position.sub(center);

      scene.add(loadedModel);

      screenMesh = loadedModel.getObjectByName('imageTexture');
      if (screenMesh && screenMesh.type === 'Group') {
        screenMesh.traverse(child => {
          if (child.isMesh){
            screenMesh = child;
          }
        })
      }

      loadedModel.traverse(child => {
        if (child.name.toLowerCase().includes("button")) {
          clickableButtons.push(child);
        }
      });

      updateScreenTexture(playlist[current].art);

    });

    undefined,
    function(error) {
      console.error('Model loading error:', error);
    };

// Texture and Materials
function updateScreenTexture(imagePath) {
  const loader = new THREE.TextureLoader ();
  loader.load(imagePath, texture => {
    if (screenMesh && screenMesh.material) {
     screenMesh.material.map = texture;
    screenMesh.material.needsUpdate = true;
    } else {
    console.warn('screenMesh or its material no found.');
  }
  });
}

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