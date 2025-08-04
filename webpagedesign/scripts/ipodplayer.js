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
  camera.position.set(0, 0, 10.000);
  camera.rotation.set(0, 0, 0)

  // OrbitControls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  camera.position.set(0, 0, 10)
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

