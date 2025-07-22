import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/loaders/GLTFLoader.js';

export function loadDevice(containerId, modelPath, audioPath) {
  const container = document.getElementById(containerId);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);

  const light = new THREE.HemisphereLight(0xffffff, 0x444444);
  scene.add(light);

  const loader = new GLTFLoader();
  let mixer, model, screenTexture, screenMesh;

  loader.load(modelPath, function (gltf) {
    model = gltf.scene;
    scene.add(model);
    model.scale.set(5, 5, 5);
    model.rotation.y = Math.PI;

    // Create and draw to canvas
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 1000;
    screenCanvas.height = 1000;
    const ctx = screenCanvas.getContext('2d');

    function drawCanvas() {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 1000, 1000);

      ctx.fillStyle = 'lime';
      ctx.font = '28px Helvetica';
      ctx.fillText('Now Playing:', 50, 60);
      ['1. Fade', '2. Genius', '3. Legacy'].forEach((song, i) => {
        ctx.fillText(song, 50, 120 + i * 40);
      });

      requestAnimationFrame(drawCanvas);
    }

    drawCanvas();
    screenTexture = new THREE.CanvasTexture(screenCanvas);

    model.traverse((child) => {
      if (child.isMesh && child.material && child.material.name === 'iPod_Screen') {
        child.material = new THREE.MeshBasicMaterial({ map: screenTexture });
        screenMesh = child;
      }
    });

    if (gltf.animations.length) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[0]);
      action.play();
    }
  });

  camera.position.z = 5;
  const clock = new THREE.Clock();

  // Audio setup
  const listener = new THREE.AudioListener();
  camera.add(listener);
  const sound = new THREE.Audio(listener);
  const audioLoader = new THREE.AudioLoader();

  audioLoader.load(audioPath, function (buffer) {
    sound.setBuffer(buffer);
    sound.setLoop(true);
    sound.setVolume(0.5);

    container.addEventListener('click', () => {
      if (sound.isPlaying) {
        sound.pause();
      } else {
        sound.play();
      }
    });
  });

  function animate() {
    requestAnimationFrame(animate);
    if (mixer) mixer.update(clock.getDelta());
    if (screenTexture) screenTexture.needsUpdate = true;
    renderer.render(scene, camera);
  }

  animate();
}

