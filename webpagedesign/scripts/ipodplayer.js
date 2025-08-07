let renderer, clock, mixer, camera, scene;
let loadedModel;
let iPod, screenMesh, audio;
let clickableButtons = [];

let currentTrack = 0;
const songs = ['assets/audio/you-rock-my-world.mp3', 'assets/audio/crazy-in-love.mp3'];
const screens = ['assets/screens/rock-my-world-michael-jackson.png', 'assets/screens/crazy-in-love-beyonce.png'];


const canvas = document.getElementById('threeContainer');

// Clock for animation (if needed)
clock = new THREE.Clock();

// Set up the renderer
renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

// Create scene
scene = new THREE.Scene();

// Set up the camera
camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 10);

// Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

// Lighting
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
scene.add(light);


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

      updateScreenTexture(screens[currentTrack]);
      setupAudio(songs[currentTrack]);

    });

  // Audio
  function setupAudio(path) {

    const listener = new THREE.AudioListener();
    camera.add(listener);

    const audioLoader = new THREE.AudioLoader();
    audio = new THREE.Audio(listener);

    audioLoader.load(path, buffer => {
      audio.setBuffer(buffer);
      audio.setLoop(false);
      audio.setVolume(0.8);
    });
  }
    
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

    switch(buttonNameName){
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