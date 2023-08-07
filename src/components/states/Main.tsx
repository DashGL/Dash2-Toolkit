/*

    Copyright (C) 2023 DashGL - Benjamin Collins
    This file is part of MML2 StateViewer

    MML2 StateViewer is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    MML2 StateViewer is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with MML2 StateViewer. If not, see <http://www.gnu.org/licenses/>.

*/

// Import

import * as THREE from "three";
import { OrbitControls } from "@three-ts/orbit-controls";
import { createSignal, onMount } from "solid-js";
import { saveAs } from "file-saver";
import { setAnimationList } from "./viewport/AnimControls";
import type { EntityHeader, PostMessage, SaveState } from "@scripts/index";
import { Entity } from "@scripts/ReadEntity";
import localForage from "localforage";

const store = localForage.createInstance({
  name: "MML2-StateViewer",
});


import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import { Player } from "@scripts/ReadPlayer";

const [getRenderer, setRenderer] = createSignal<
  THREE.WebGLRenderer | undefined
>();
// State that needs to be set onload
const [canvasRef, setCanvasRef] = createSignal<HTMLCanvasElement>();
const [getScreenshot, setScreenshot] = createSignal(-1);

// States with fixed instances
const scene = new THREE.Scene();
const grid = new THREE.GridHelper(100, 10);

let skelHelper: THREE.SkeletonHelper | null;

type MainMemory = {
  mount: boolean;
  mesh: THREE.Mesh | null;
  mixer: THREE.AnimationMixer | null;
  action: THREE.AnimationAction | null;
  clock: THREE.Clock;
  canvas: HTMLCanvasElement | null;
  camera: THREE.PerspectiveCamera | null;
};

const viewer: MainMemory = {
  mount: false,
  mesh: null,
  mixer: null,
  action: null,
  clock: new THREE.Clock(),
  canvas: null,
  camera: null,
};

// State

const resetScene = () => {

  if (viewer.mesh) {
    scene.remove(viewer.mesh);
  }

  const { children } = scene;
  children.forEach((child) => {
    scene.remove(child);
  });
  scene.add(grid);
};

// // Functions

const resetCamera = () => {
  viewer.camera!.position.z = 55;
  viewer.camera!.position.y = 25;
  viewer.camera!.position.x = 0;
  viewer.camera!.lookAt(new THREE.Vector3(0, 0, 0));
};

const updateDimensions = () => {
  const width = window.innerWidth - 320;
  const height = window.innerHeight;

  const renderer = getRenderer();
  renderer!.setSize(width, height);
  viewer.camera!.aspect = width / height;
  viewer.camera!.updateProjectionMatrix();
};

const animate = () => {
  requestAnimationFrame(animate);

  if (getScreenshot() === 0) {
    scene.remove(grid);
    setScreenshot(1);
  } else if (getScreenshot() === 1) {
    takeScreeenshot();
    scene.add(grid);
    setScreenshot(-1);
  }

  if (viewer.mixer) {
    const delta = viewer.clock.getDelta();
    viewer.mixer.update(delta);
  }

  const renderer = getRenderer();
  renderer!.render(scene, viewer.camera!);
};

const setPlayer = async () => {
  resetScene();

  const name = localStorage.getItem("name");
  if (!name) {
    return;
  }

  const saveState = (await store.getItem(name)) as SaveState;
  const { mem } = saveState;

  const player = new Player(mem);
  const mesh = player.parseMesh();
  viewer.mesh = mesh;
  scene.add(mesh);

}

const setEntity = (mem: ArrayBuffer, entity: EntityHeader) => {
  resetScene();

  const reader = new Entity(mem!);
  const mesh = reader.parseMesh(entity.meshOfs);
  mesh.name = entity.name;

  if (entity.tracksOfs && entity.controlOfs) {
    const anims = reader.parseAnimation(entity.tracksOfs, entity.controlOfs);
    mesh.animations = anims;
  }

  viewer.mesh = mesh;
  if (mesh.skeleton) {
    skelHelper = new THREE.SkeletonHelper(mesh);
    mesh.add(skelHelper);
  }

  if (mesh.animations && mesh.animations.length) {
    setAnimationList(mesh.animations);
  }
  scene.add(mesh);
};

const setAnimation = (index: number) => {
  const { mesh } = viewer;
  if (!mesh) {
    return;
  }

  if (viewer.action) {
    viewer.action.stop();
  }

  if (index === -1) {
    return;
  }

  const clip = mesh.animations[index];
  const mixer = new THREE.AnimationMixer(mesh as THREE.Object3D);
  const action = mixer.clipAction(clip, mesh as THREE.Object3D);
  action.play();
  viewer.action = action;
  viewer.mixer = mixer;
};

const handleDownload = () => {

  if (!viewer.mesh) {
    return;
  }

  const { mesh } = viewer;
  const anims = mesh.animations || [];

  const exporter = new GLTFExporter();
  const opt = {
    binary: false,
    animations: anims,
  };

  exporter.parse(
    mesh,
    (result) => {
      const mime = { type: "application/octet-stream" };
      const str = JSON.stringify(result, null, 2);
      const blob = new Blob([str], mime);
      saveAs(blob, `${mesh.name}.gltf`);
    },
    (error) => {
      throw error;
    },
    opt
  );
};

const handleMessage = async (event: MessageEvent) => {
  const { data } = event;
  const message = data as PostMessage;

  switch (message.type) {
    case "screenshot":
      setScreenshot(0);
      break;
    case "Entity":
      setEntity(message.mem!, message.entity!);
      break;
    case "Player":
      setPlayer();
      break;
    case "reset":
      resetCamera();
      break;
    case "Animation":
      setAnimation(message.index!);
      break;
    case "Play":
      viewer.action && viewer.action.play();
      break;
    case "Pause":
      viewer.action && (viewer.action.paused = true);
      break;
    case "Download":
      handleDownload();
      break;
  }
};

/**
 *
 * Takes a screenshot of the current viewport and downloads it as a png
 *
 * @returns null
 *
 */

const takeScreeenshot = async () => {
  const mime = "image/png";
  const renderer = getRenderer();
  const url = renderer!.domElement.toDataURL(mime);
  const req = await fetch(url);
  const blob = await req.blob();
  saveAs(blob, "screenshot.png");
};

const Viewport = () => {
  onMount(() => {
    const canvas = canvasRef()!;
    viewer.mount = true;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      preserveDrawingBuffer: true,
      antialias: true,
      alpha: true,
    });
    renderer.setClearColor(new THREE.Color(0), 0);
    setRenderer(renderer);

    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    viewer.camera = camera;
    new OrbitControls(camera, canvas);
    scene.add(grid);

    window.addEventListener("resize", updateDimensions);
    window.addEventListener("message", handleMessage);
    updateDimensions();
    resetCamera();
    animate();
  });

  return <canvas ref={setCanvasRef} id="canvas"></canvas>;
};

export default Viewport;
