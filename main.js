import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Octree } from "three/addons/math/Octree.js";
import { Capsule } from "three/addons/math/Capsule.js";

//Audio with Howler.js
const sounds = {
  backgroundMusic: new Howl({
    src: ["./sfx/music.ogg"],
    loop: true,
    volume: 0.3,
    preload: true,
  }),

  projectsSFX: new Howl({
    src: ["./sfx/projects.ogg"],
    volume: 0.5,
    preload: true,
  }),

  pokemonSFX: new Howl({
    src: ["./sfx/pokemon.ogg"],
    volume: 0.5,
    preload: true,
  }),

  jumpSFX: new Howl({
    src: ["./sfx/jumpsfx.ogg"],
    volume: 1.0,
    preload: true,
  }),
};

let touchHappened = false;

let isMuted = false;

function playSound(soundId) {
  if (!isMuted && sounds[soundId]) {
    sounds[soundId].play();
  }
}

function stopSound(soundId) {
  if (sounds[soundId]) {
    sounds[soundId].stop();
  }
}

//three.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaec972);
const canvas = document.getElementById("experience-canvas");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Physics stuff
const GRAVITY = 30;
const CAPSULE_RADIUS = 0.35;
const CAPSULE_HEIGHT = 1;
const JUMP_HEIGHT = 11;
const MOVE_SPEED = 7;
const CHARACTER_Y_OFFSET = 1;

let character = {
  instance: null,
  isMoving: false,
  spawnPosition: new THREE.Vector3(),
};
let targetRotation = Math.PI / 2;

const colliderOctree = new Octree();
// Align collider to start at y=0 (feet)
const playerCollider = new Capsule(
  new THREE.Vector3(0, 0, 0), // start at feet
  new THREE.Vector3(0, CAPSULE_HEIGHT, 0),
  CAPSULE_RADIUS
);

let playerVelocity = new THREE.Vector3();
let playerOnFloor = false;

// Renderer Stuff
// See: https://threejs.org/docs/?q=render#api/en/constants/Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.7;

// Some of our DOM elements, others are scattered in the file
let isModalOpen = false;
const modal = document.querySelector(".modal");
const modalbgOverlay = document.querySelector(".modal-bg-overlay");
const modalTitle = document.querySelector(".modal-title");
const modalProjectDescription = document.querySelector(
  ".modal-project-description"
);
const modalExitButton = document.querySelector(".modal-exit-button");
const modalVisitProjectButton = document.querySelector(
  ".modal-project-visit-button"
);
const themeToggleButton = document.querySelector(".theme-mode-toggle-button");
const firstIcon = document.querySelector(".first-icon");
const secondIcon = document.querySelector(".second-icon");

const audioToggleButton = document.querySelector(".audio-toggle-button");
const firstIconTwo = document.querySelector(".first-icon-two");
const secondIconTwo = document.querySelector(".second-icon-two");

// Modal stuff
const modalContent = {
  Project_1: {
    title: "🍜Recipe Finder👩🏻‍🍳",
    content:
      "Let's get cooking! This project uses TheMealDB API for some recipes and populates my React card components. This shows my skills in working with consistent design systems using components. There is also pagination to switch pages.",
    link: "https://example.com/",
  },
  Project_2: {
    title: "FoxyTunes🦊🎶",
    content:
      "FoxyTunes is an easy-to-use, cross-platform, offline (just one out of three, yet 🙂) space to share music, messages, and moods with someone special. Also, to get rid of Spotify's stupid ads and premium benefits. Here, you can download every single song from Spotify and listen to them offline without paying anything. (I dont want you to spend your money 😢)",
    link: "https://foxytunes.onrender.com",
  },
  Project_3: {
    title: "🌞Weather App😎",
    content:
      "Rise and shine as they say (but sometimes it's not all that shiny outside). Using a location-based API the user can automatically detect their location and my application will show them the weather near them. I also put some of my design skills to use using Figma.",
    link: "https://example.com/",
  },
  Chest: {
    title: "About Me",
    content:
      "Hiii! You found my chest👋! Since you shared with me one day your personality type, i feel like, its my turn to reveal it. Drum roll... dum dum~ tss🥁🥁 im a mix of two personalities! Well, how can that be? You see... I have always danced between the lines of two worlds, the dreamy soul of an INFP, and the intuitive heart of an INFJ. One lives in feeling deeply and staying true to what matters most... While the other sees the big picture, reads between silences, and longs to understand meaning in everything. Sometimes i follow my heart like a soft rebel... Other times, i get quiet, thoughtful, mapping out emotions like a gentle strategist. So... am i one or the other? Im not exactly sure, i can relate to both. Maybe im just me, stitched from both, and stiched with care, and thats what matters the most ❤️. But if this answer isnt satisfying, i did a test once, and it was INFJ 🙂.",
  },
  Picnic: {
    title: "A Memory Wrapped in Sunlight ☀️",
    content:
      "Remember how we had a little picnic once in LifeTogether on the sidewalk? Haha, that one carved itself into my memory. That grandpa who wouldnt stop talking until we ran off laughing. Or were you scared? 😅 It was a little piece of forever, disguised as just another afternoon. 💛",
  },
};

function showModal(id) {
  const content = modalContent[id];
  if (content) {
    modalTitle.textContent = content.title;
    modalProjectDescription.textContent = content.content;

    if (content.link) {
      modalVisitProjectButton.href = content.link;
      modalVisitProjectButton.classList.remove("hidden");
    } else {
      modalVisitProjectButton.classList.add("hidden");
    }
    modal.classList.remove("hidden");
    modalbgOverlay.classList.remove("hidden");
    isModalOpen = true;
  }
}

function hideModal() {
  isModalOpen = false;
  modal.classList.add("hidden");
  modalbgOverlay.classList.add("hidden");
  if (!isMuted) {
    playSound("projectsSFX");
  }
}

// Our Intersecting objects
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let intersectObject = "";
const intersectObjects = [];
const intersectObjectsNames = [
  "Project_1",
  "Project_2",
  "Project_3",
  "Picnic",
  "Squirtle",
  "Chicken",
  "Pikachu",
  "Bulbasaur",
  "Charmander",
  "Snorlax",
  "Chest",
  "Gag",
  "Whimpering_brown"
];

// Loading screen and loading manager
// See: https://threejs.org/docs/#api/en/loaders/managers/LoadingManager
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.querySelector(".loading-text");
const enterButton = document.querySelector(".enter-button");
const instructions = document.querySelector(".instructions");

const manager = new THREE.LoadingManager();

manager.onLoad = function () {
  const t1 = gsap.timeline();

  t1.to(loadingText, {
    opacity: 0,
    duration: 0,
  });

  t1.to(enterButton, {
    opacity: 1,
    duration: 0,
  });
};

enterButton.addEventListener("click", () => {
  gsap.to(loadingScreen, {
    opacity: 0,
    duration: 0,
  });
  gsap.to(instructions, {
    opacity: 0,
    duration: 0,
    onComplete: () => {
      loadingScreen.remove();
    },
  });

  if (!isMuted) {
    playSound("projectsSFX");
    playSound("backgroundMusic");
  }
});

//Audio

// GLTF Loader
// See: https://threejs.org/docs/?q=glt#examples/en/loaders/GLTFLoader
const loader = new GLTFLoader(manager);



const sparkleTexture = new THREE.TextureLoader().load('./media/sparkle.png');
const sparkleMaterial = new THREE.SpriteMaterial({
  map: sparkleTexture,
  color: new THREE.Color("#ff99cc"),
  transparent: true,
  opacity: 0.9
});

const sparkleGroup = new THREE.Group();
for (let i = 0; i < 40; i++) {
  const sparkle = new THREE.Sprite(sparkleMaterial);
  sparkle.scale.set(0.3, 0.3, 0.3);  // Size of each sparkle
  sparkle.position.set(
    (Math.random() - 0.5) * 4,  // Around the text X
    Math.random() * 2,          // Height
    (Math.random() - 0.5) * 4   // Around the text Z
  );
  sparkleGroup.add(sparkle);
}
scene.add(sparkleGroup);

function animateSparkles() {
  sparkleGroup.children.forEach((sparkle, i) => {
    sparkle.position.y += 0.005 * Math.sin(Date.now() * 0.001 + i);
  });
  requestAnimationFrame(animateSparkles);
}
animateSparkles();



loader.load(
  "./Portfolio.glb",
  function (glb) {
    glb.scene.traverse((child) => {
      if (intersectObjectsNames.includes(child.name)) {
        intersectObjects.push(child);
      }
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }

      if (child.name === "Text" && child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: "#ff66cc",
          emissive: "#ff66cc",
          emissiveIntensity: 0.5,
          metalness: 0.3,
          roughness: 0.4,
        });
      }

      const mat = child.material;
      if (mat) {
        mat.side = THREE.DoubleSide;
        mat.depthWrite = true;
        mat.depthTest = true;
        mat.blending = THREE.NoBlending;
        mat.transparent = true;

        mat.needsUpdate = true;
      }

      if (child.name === "Character") {
        character.spawnPosition.copy(child.position);
        character.instance = child;
        playerCollider.start
          .copy(child.position)
          .add(new THREE.Vector3(0, CAPSULE_RADIUS, 0));
        playerCollider.end
          .copy(child.position)
          .add(new THREE.Vector3(0, CAPSULE_HEIGHT, 0));
      }
      if (child.name === "Ground_Collider") {
        colliderOctree.fromGraphNode(child);
        child.visible = false;
      }
    });
    scene.add(glb.scene);
  },
  undefined,
  function (error) {
    console.error(error);
  }
);

// Lighting and Enviornment Stuff
// See: https://threejs.org/docs/?q=light#api/en/lights/DirectionalLight
// See: https://threejs.org/docs/?q=light#api/en/lights/AmbientLight
const sun = new THREE.DirectionalLight(0xffffff);
sun.castShadow = true;
sun.position.set(280, 200, -80);
sun.target.position.set(100, 0, -10);
sun.shadow.mapSize.width = 4096;
sun.shadow.mapSize.height = 4096;
sun.shadow.camera.left = -150;
sun.shadow.camera.right = 300;
sun.shadow.camera.top = 150;
sun.shadow.camera.bottom = -100;
sun.shadow.normalBias = 0.2;
scene.add(sun.target);
scene.add(sun);

// const shadowCameraHelper = new THREE.CameraHelper(sun.shadow.camera);
// scene.add(shadowCameraHelper);

// const sunHelper = new THREE.CameraHelper(sun);
// scene.add(sunHelper);

const light = new THREE.AmbientLight(0x404040, 2.7);
scene.add(light);

// Camera Stuff
// See: https://threejs.org/docs/?q=orth#api/en/cameras/OrthographicCamera
const aspect = sizes.width / sizes.height;
const camera = new THREE.OrthographicCamera(
  -aspect * 50,
  aspect * 50,
  50,
  -50,
  1,
  1000
);

camera.position.x = -13;
camera.position.y = 39;
camera.position.z = -67;

const cameraOffset = new THREE.Vector3(-13, 39, -67);

camera.zoom = 2.2;
camera.updateProjectionMatrix();

const controls = new OrbitControls(camera, canvas);
controls.update();

// Handle when window resizes
function onResize() {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  const aspect = sizes.width / sizes.height;
  camera.left = -aspect * 50;
  camera.right = aspect * 50;
  camera.top = 50;
  camera.bottom = -50;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

// Interact with Objects and Raycaster
// See: https://threejs.org/docs/?q=raycas#api/en/core/Raycaster
let isCharacterReady = true;

// Track Gag's rotation globally
let gagRotation = 0;

// Function to create a heart texture from heart.png
function createHeartTexture() {
  const texture = new THREE.TextureLoader().load('./media/heart.png');
  texture.encoding = THREE.sRGBEncoding;
  texture.needsUpdate = true;
  return texture;
}

function spawnHeartsAbove(mesh, count = 15) {
  const heartTexture = createHeartTexture();
  for (let i = 0; i < count; i++) {
    const material = new THREE.SpriteMaterial({
      map: heartTexture,
      transparent: true,
      opacity: 1,
      premultipliedAlpha: true
    });
    const sprite = new THREE.Sprite(material);
    // Position above Gag, randomize a bit
    sprite.position.copy(mesh.position);
    sprite.position.y += 10 + Math.random() * 1.5; // Appear higher above Gag
    sprite.position.x += (Math.random() - 0.5) * 2;
    sprite.position.z += (Math.random() - 0.5) * 2;
    sprite.scale.set(2, 2, 2); // Big hearts

    scene.add(sprite);

    // Animate: float up and fade out, then remove
    gsap.to(sprite.position, {
      y: sprite.position.y + 2 + Math.random(),
      duration: 1.2,
      ease: "power1.out"
    });
    gsap.to(sprite.material, {
      opacity: 0,
      duration: 1.2,
      delay: 0.2,
      onComplete: () => {
        scene.remove(sprite);
        sprite.material.dispose();
        sprite.geometry && sprite.geometry.dispose();
      }
    });
  }
}

function spawnHearts(mesh, count = 15) {
  const heartTexture = createHeartTexture();
  for (let i = 0; i < count; i++) {
    const material = new THREE.SpriteMaterial({
      map: heartTexture,
      transparent: true,
      opacity: 1,
      premultipliedAlpha: true
    });
    const sprite = new THREE.Sprite(material);
    // Position above Gag, randomize a bit
    sprite.position.copy(mesh.position);
    sprite.position.y += 2 + Math.random() * 1.5; // Appear higher above Gag
    sprite.position.x += (Math.random() - 0.5) * 2 - 2;
    sprite.position.z += (Math.random() - 0.5) * 2;
    sprite.scale.set(2, 2, 2); // Big hearts

    scene.add(sprite);

    // Animate: float up and fade out, then remove
    gsap.to(sprite.position, {
      y: sprite.position.y + 2 + Math.random(),
      duration: 1.2,
      ease: "power1.out"
    });
    gsap.to(sprite.material, {
      opacity: 0,
      duration: 1.2,
      delay: 0.2,
      onComplete: () => {
        scene.remove(sprite);
        sprite.material.dispose();
        sprite.geometry && sprite.geometry.dispose();
      }
    });
  }
}

const snorlaxDefaultScale = { x: 1, y: 1, z: 1 };
function jumpCharacter(meshID) {
  console.log("jumpCharacter called with meshID:", meshID);
  const mesh = scene.getObjectByName(meshID);
  console.log("Found mesh:", mesh);
  if (!isCharacterReady) return;

  const jumpHeight = 2;
  const jumpDuration = 0.5;
  const isSnorlax = meshID === "Snorlax";
  const isGag = meshID === "Gag";
  const isWhimperingbrown = meshID === "Whimpering_brown";

  // Use original scale for Snorlax, current scale otherwise
  const currentScale = isSnorlax
    ? snorlaxDefaultScale
    : {
        x: mesh ? mesh.scale.x : 1,
        y: mesh ? mesh.scale.y : 1,
        z: mesh ? mesh.scale.z : 1,
      };

  const t1 = gsap.timeline();

  if (isWhimperingbrown) {
    console.log("Running custom Whimpering_brown animation!");
    spawnHearts(mesh);
    t1.to(mesh.scale, {
      z: currentScale.z * 1.6,
      duration: jumpDuration * 0.2,
      ease: "power2.out",
    });
    t1.to(
      mesh.position,
      {
        y: mesh.position.y + jumpHeight * 2.2,
        duration: jumpDuration * 0.7,
        ease: "power2.out",
      },
      "<"
    );
    t1.to(mesh.scale, {
      x: currentScale.x,
      y: currentScale.y,
      z: currentScale.z,
      duration: jumpDuration * 0.3,
      ease: "elastic.out(1, 0.3)",
      onComplete: () => {
        isCharacterReady = true;
      },
    });
    t1.to(
      mesh.position,
      {
        y: mesh.position.y,
        duration: jumpDuration * 0.7,
        ease: "bounce.out",
      },
      "<"
    );
    return;
  }

  if (isGag) {
    console.log("Running custom Gag animation!");
    spawnHeartsAbove(mesh);
    gagRotation += Math.PI / 2;
    if (gagRotation >= Math.PI * 2) gagRotation = 0;
    t1.to(mesh.scale, {
      x: currentScale.x * 1.6,
      y: currentScale.y * 0.6,
      z: currentScale.z * 1.6,
      duration: jumpDuration * 0.2,
      ease: "power2.out",
    });
    t1.to(
      mesh.rotation,
      {
        y: gagRotation,
        duration: jumpDuration * 0.7,
        ease: "power2.out",
      },
      "<"
    );
    t1.to(
      mesh.position,
      {
        y: mesh.position.y + jumpHeight * 2.2,
        duration: jumpDuration * 0.7,
        ease: "power2.out",
      },
      "<"
    );
    t1.to(mesh.scale, {
      x: currentScale.x,
      y: currentScale.y,
      z: currentScale.z,
      duration: jumpDuration * 0.3,
      ease: "elastic.out(1, 0.3)",
      onComplete: () => {
        isCharacterReady = true;
      },
    });
    t1.to(
      mesh.position,
      {
        y: mesh.position.y,
        duration: jumpDuration * 0.7,
        ease: "bounce.out",
      },
      "<"
    );
    return;
  }

  // Snorlax animation with fixed base scale
  t1.to(mesh.scale, {
    x: isSnorlax ? snorlaxDefaultScale.x * 1.2 : 1.2,
    y: isSnorlax ? snorlaxDefaultScale.y * 0.8 : 0.8,
    z: isSnorlax ? snorlaxDefaultScale.z * 1.2 : 1.2,
    duration: jumpDuration * 0.2,
    ease: "power2.out",
  });

  t1.to(mesh.scale, {
    x: isSnorlax ? snorlaxDefaultScale.x * 0.8 : 0.8,
    y: isSnorlax ? snorlaxDefaultScale.y * 1.3 : 1.3,
    z: isSnorlax ? snorlaxDefaultScale.z * 0.8 : 0.8,
    duration: jumpDuration * 0.3,
    ease: "power2.out",
  });

  t1.to(
    mesh.position,
    {
      y: mesh.position.y + jumpHeight,
      duration: jumpDuration * 0.5,
      ease: "power2.out",
    },
    "<"
  );

  t1.to(mesh.scale, {
    x: isSnorlax ? snorlaxDefaultScale.x * 1.2 : 1,
    y: isSnorlax ? snorlaxDefaultScale.y * 1.2 : 1,
    z: isSnorlax ? snorlaxDefaultScale.z * 1.2 : 1,
    duration: jumpDuration * 0.3,
    ease: "power1.inOut",
  });

  t1.to(
    mesh.position,
    {
      y: mesh.position.y,
      duration: jumpDuration * 0.5,
      ease: "bounce.out",
    },
    ">"
  );

  // Reset scale to default at the end for Snorlax and others
  t1.to(mesh.scale, {
    x: snorlaxDefaultScale.x,
    y: snorlaxDefaultScale.y,
    z: snorlaxDefaultScale.z,
    duration: jumpDuration * 0.2,
    ease: "elastic.out(1, 0.3)",
    onComplete: () => {
      isCharacterReady = true;
    },
  });
}

function onClick() {
  if (touchHappened) return;
  handleInteraction();
}

function handleInteraction() {
  if (!modal.classList.contains("hidden")) {
    return;
  }

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(intersectObjects);

  const characterNames = [
    "Bulbasaur",
    "Chicken",
    "Pikachu",
    "Charmander",
    "Squirtle",
    "Snorlax",
    "Gag",
    "Whimpering_brown"
  ];
  const modalNames = [
    "Chest",
    "Picnic",
    "Project_1",
    "Project_2",
    "Project_3",
  ];

  let foundName = "";
  if (intersects.length > 0) {
    const obj = intersects[0].object;
    if (characterNames.includes(obj.name) || modalNames.includes(obj.name)) {
      foundName = obj.name;
    } else if (obj.parent && (characterNames.includes(obj.parent.name) || modalNames.includes(obj.parent.name))) {
      foundName = obj.parent.name;
    } else if (obj.parent && obj.parent.parent && (characterNames.includes(obj.parent.parent.name) || modalNames.includes(obj.parent.parent.name))) {
      foundName = obj.parent.parent.name;
    } else {
      foundName = obj.name; // fallback
    }
    console.log("Clicked object:", obj.name, "Parent:", obj.parent?.name, "Grandparent:", obj.parent?.parent?.name);
  }
  intersectObject = foundName;

  console.log("intersectObject:", intersectObject);

  if (intersectObject !== "") {
    if (characterNames.includes(intersectObject)) {
      if (isCharacterReady) {
        if (!isMuted) {
          playSound("pokemonSFX");
        }
        jumpCharacter(intersectObject);
        isCharacterReady = false;
      }
    } else if (modalNames.includes(intersectObject)) {
      showModal(intersectObject);
      if (!isMuted) {
        playSound("projectsSFX");
      }
    }
  }
}

function onMouseMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  touchHappened = false;
}

function onTouchEnd(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  touchHappened = true;
  handleInteraction();
}

// Movement and Gameplay functions
function respawnCharacter() {
  character.instance.position.copy(character.spawnPosition);

  // Align collider to start at y=0 (feet)
  playerCollider.start.copy(character.spawnPosition);
  playerCollider.end
    .copy(character.spawnPosition)
    .add(new THREE.Vector3(0, CAPSULE_HEIGHT, 0));

  playerVelocity.set(0, 0, 0);
  character.isMoving = false;
}

function playerCollisions() {
  const result = colliderOctree.capsuleIntersect(playerCollider);
  playerOnFloor = false;

  if (result) {
    playerOnFloor = result.normal.y > 0;
    playerCollider.translate(result.normal.multiplyScalar(result.depth));

    if (playerOnFloor) {
      character.isMoving = false;
      playerVelocity.x = 0;
      playerVelocity.z = 0;
    }
  }
}

function updatePlayer() {
  if (!character.instance) return;

  if (character.instance.position.y < -20) {
    respawnCharacter();
    return;
  }

  if (!playerOnFloor) {
    playerVelocity.y -= GRAVITY * 0.035;
  }

  playerCollider.translate(playerVelocity.clone().multiplyScalar(0.035));

  playerCollisions();

  character.instance.position.copy(playerCollider.start);
  character.instance.position.y += CHARACTER_Y_OFFSET;
  character.instance.position.y += CAPSULE_RADIUS;

  let rotationDiff =
    ((((targetRotation - character.instance.rotation.z) % (2 * Math.PI)) +
      3 * Math.PI) %
      (2 * Math.PI)) -
    Math.PI;
  let finalRotation = character.instance.rotation.z + rotationDiff;

  character.instance.rotation.z = THREE.MathUtils.lerp(
    character.instance.rotation.z,
    finalRotation,
    0.4
  );
}

function onKeyDown(event) {
  if (event.code.toLowerCase() === "keyr") {
    respawnCharacter();
    return;
  }

  switch (event.code.toLowerCase()) {
    case "keyw":
    case "arrowup":
      pressedButtons.up = true;
      break;
    case "keys":
    case "arrowdown":
      pressedButtons.down = true;
      break;
    case "keya":
    case "arrowleft":
      pressedButtons.left = true;
      break;
    case "keyd":
    case "arrowright":
      pressedButtons.right = true;
      break;
  }
}

function onKeyUp(event) {
  switch (event.code.toLowerCase()) {
    case "keyw":
    case "arrowup":
      pressedButtons.up = false;
      break;
    case "keys":
    case "arrowdown":
      pressedButtons.down = false;
      break;
    case "keya":
    case "arrowleft":
      pressedButtons.left = false;
      break;
    case "keyd":
    case "arrowright":
      pressedButtons.right = false;
      break;
  }
}

// Toggle Theme Function
function toggleTheme() {
  if (!isMuted) {
    playSound("projectsSFX");
  }
  const isDarkTheme = document.body.classList.contains("dark-theme");
  document.body.classList.toggle("dark-theme");
  document.body.classList.toggle("light-theme");

  if (firstIcon.style.display === "none") {
    firstIcon.style.display = "block";
    secondIcon.style.display = "none";
  } else {
    firstIcon.style.display = "none";
    secondIcon.style.display = "block";
  }

  gsap.to(light.color, {
    r: isDarkTheme ? 1.0 : 0.25,
    g: isDarkTheme ? 1.0 : 0.31,
    b: isDarkTheme ? 1.0 : 0.78,
    duration: 1,
    ease: "power2.inOut",
  });

  gsap.to(light, {
    intensity: isDarkTheme ? 0.8 : 0.9,
    duration: 1,
    ease: "power2.inOut",
  });

  gsap.to(sun, {
    intensity: isDarkTheme ? 1 : 0.8,
    duration: 1,
    ease: "power2.inOut",
  });

  gsap.to(sun.color, {
    r: isDarkTheme ? 1.0 : 0.25,
    g: isDarkTheme ? 1.0 : 0.41,
    b: isDarkTheme ? 1.0 : 0.88,
    duration: 1,
    ease: "power2.inOut",
  });
}

// Toggle Audio Function
function toggleAudio() {
  if (!isMuted) {
    playSound("projectsSFX");
  }
  if (firstIconTwo.style.display === "none") {
    firstIconTwo.style.display = "block";
    secondIconTwo.style.display = "none";
    isMuted = false;
    sounds.backgroundMusic.play();
  } else {
    firstIconTwo.style.display = "none";
    secondIconTwo.style.display = "block";
    isMuted = true;
    sounds.backgroundMusic.pause();
  }
}

// Mobile controls
const mobileControls = {
  up: document.querySelector(".mobile-control.up-arrow"),
  left: document.querySelector(".mobile-control.left-arrow"),
  right: document.querySelector(".mobile-control.right-arrow"),
  down: document.querySelector(".mobile-control.down-arrow"),
};

const pressedButtons = {
  up: false,
  left: false,
  right: false,
  down: false,
};

function handleJumpAnimation() {
  if (!character.instance || !character.isMoving) return;

  const jumpDuration = 0.5;
  const jumpHeight = 2;

  const t1 = gsap.timeline();

  t1.to(character.instance.scale, {
    x: 1.08,
    y: 0.9,
    z: 1.08,
    duration: jumpDuration * 0.2,
    ease: "power2.out",
  });

  t1.to(character.instance.scale, {
    x: 0.92,
    y: 1.1,
    z: 0.92,
    duration: jumpDuration * 0.3,
    ease: "power2.out",
  });

  t1.to(character.instance.scale, {
    x: 1,
    y: 1,
    z: 1,
    duration: jumpDuration * 0.3,
    ease: "power1.inOut",
  });

  t1.to(character.instance.scale, {
    x: 1,
    y: 1,
    z: 1,
    duration: jumpDuration * 0.2,
  });
}

function handleContinuousMovement() {
  if (!character.instance) return;

  if (
    Object.values(pressedButtons).some((pressed) => pressed) &&
    !character.isMoving
  ) {
    if (!isMuted) {
      playSound("jumpSFX");
    }
    if (pressedButtons.up) {
      playerVelocity.z += MOVE_SPEED;
      targetRotation = Math.PI;
    }
    if (pressedButtons.down) {
      playerVelocity.z -= MOVE_SPEED;
      targetRotation = 0;
    }
    if (pressedButtons.left) {
      playerVelocity.x += MOVE_SPEED;
      targetRotation = Math.PI / 2;
    }
    if (pressedButtons.right) {
      playerVelocity.x -= MOVE_SPEED;
      targetRotation = -Math.PI / 2;
    }

    playerVelocity.y = JUMP_HEIGHT;
    character.isMoving = true;
    handleJumpAnimation();
  }
}

Object.entries(mobileControls).forEach(([direction, element]) => {
  element.addEventListener("touchstart", (e) => {
    e.preventDefault();
    pressedButtons[direction] = true;
  });

  element.addEventListener("touchend", (e) => {
    e.preventDefault();
    pressedButtons[direction] = false;
  });

  element.addEventListener("mousedown", (e) => {
    e.preventDefault();
    pressedButtons[direction] = true;
  });

  element.addEventListener("mouseup", (e) => {
    e.preventDefault();
    pressedButtons[direction] = false;
  });

  element.addEventListener("mouseleave", (e) => {
    pressedButtons[direction] = false;
  });

  element.addEventListener("touchcancel", (e) => {
    pressedButtons[direction] = false;
  });
});

window.addEventListener("blur", () => {
  Object.keys(pressedButtons).forEach((key) => {
    pressedButtons[key] = false;
  });
});

// Adding Event Listeners (tbh could make some of these just themselves rather than seperating them, oh well)
modalExitButton.addEventListener("click", hideModal);
modalbgOverlay.addEventListener("click", hideModal);
themeToggleButton.addEventListener("click", toggleTheme);
audioToggleButton.addEventListener("click", toggleAudio);
window.addEventListener("resize", onResize);
window.addEventListener("click", onClick, { passive: false });
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("touchend", onTouchEnd, { passive: false });
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);

// Like our movie strip!!! Calls on each frame.
function animate() {
  updatePlayer();
  handleContinuousMovement();

  if (character.instance) {
    const targetCameraPosition = new THREE.Vector3(
      character.instance.position.x + cameraOffset.x - 20,
      cameraOffset.y,
      character.instance.position.z + cameraOffset.z + 30
    );
    camera.position.copy(targetCameraPosition);
    camera.lookAt(
      character.instance.position.x + 10,
      camera.position.y - 39,
      character.instance.position.z + 10
    );
  }

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(intersectObjects);

  if (intersects.length > 0) {
    document.body.style.cursor = "pointer";
  } else {
    document.body.style.cursor = "default";
    intersectObject = "";
  }

  for (let i = 0; i < intersects.length; i++) {
    intersectObject = intersects[0].object.parent.name;
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
