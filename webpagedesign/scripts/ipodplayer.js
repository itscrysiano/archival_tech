 let renderer, clock, mixer, camera, scene;
let loadedModel;

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
    'assets/models/ipod3.glb',
    function(gltf) {
      loadedModel = gltf.scene;

    const box = new THREE.Box3().setFromObject(loadedModel);
    const center = box.getCenter(new THREE.Vector3());
    loadedModel.position.sub(center);

      scene.add(loadedModel);
    },
    
    undefined,
    function(error) {
      console.error('Model loading error:', error);
    }
  );
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