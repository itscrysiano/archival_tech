 var renderer, clock, mixer;
  let loadedModel;

  const canvas = document.getElementById('threeContainer');

  // Resize function definition
  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height);
  }

  // Initialize renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  resize(); // Now this works

  // Scene and camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.set(0, 1, 4);

  // OrbitControls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(1, 2, 0);
  controls.update();

  // Lighting
  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
  scene.add(light);

  // Load model
  const loader = new THREE.GLTFLoader();
  loader.load(
    'assets/models/ipod2.glb',
    function(gltf) {
      loadedModel = gltf.scene;
      scene.add(loadedModel);
    },
    undefined,
    function(error) {
      console.error('Model loading error:', error);
    }
  );

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  // Handle window resize
  window.addEventListener('resize', () => {
    resize();
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  });

