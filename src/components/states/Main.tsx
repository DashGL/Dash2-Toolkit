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
import type { EntityHeader, PostMessage } from "@scripts/index";
import { Entity } from "@scripts/ReadEntity";

const [getRenderer, setRenderer] = createSignal<
  THREE.WebGLRenderer | undefined
>();
// State that needs to be set onload
const [canvasRef, setCanvasRef] = createSignal<HTMLCanvasElement>();
const [getScreenshot, setScreenshot] = createSignal(-1);

// States with fixed instances
const [getScene] = createSignal(new THREE.Scene());
const [getGrid] = createSignal(new THREE.GridHelper(100, 10));

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
  const scene = getScene();
  const { children } = scene;
  children.forEach((child) => {
    scene.remove(child);
  });
  scene.add(getGrid());
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

  const scene = getScene();
  if (getScreenshot() === 0) {
    scene.remove(getGrid());
    setScreenshot(1);
  } else if (getScreenshot() === 1) {
    takeScreeenshot();
    scene.add(getGrid());
    setScreenshot(-1);
  }

  if (viewer.mixer) {
    const delta = viewer.clock.getDelta();
    viewer.mixer.update(delta);
  }

  const renderer = getRenderer();
  renderer!.render(scene, viewer.camera!);
};

const setEntity = (mem: ArrayBuffer, entity: EntityHeader) => {
  const reader = new Entity(mem!);
  const mesh = reader.parseMesh(entity.meshOfs);
  mesh.name = entity.name;

  if (entity.tracksOfs && entity.controlOfs) {
    const anims = reader.parseAnimation(entity.tracksOfs, entity.controlOfs);
    mesh.animations = anims;
  }

  resetScene();
  viewer.mesh = mesh;
  if (mesh.skeleton) {
    skelHelper = new THREE.SkeletonHelper(mesh);
    mesh.add(skelHelper);
  }

  if (mesh.animations && mesh.animations.length) {
    setAnimationList(mesh.animations);
  }
  const scene = getScene();
  scene.add(mesh);
};

const handleMessage = async (event: MessageEvent) => {
  const { data } = event;
  const message = data as PostMessage;

  switch (message.type) {
    case "screenshot":
      // takeScreeenshot();
      setScreenshot(0);
      break;
    case "Entity":
      setEntity(message.mem!, message.entity!);
      break;
    case "reset":
      resetCamera();
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

    const scene = getScene();
    scene.add(getGrid());

    window.addEventListener("resize", updateDimensions);
    window.addEventListener("message", handleMessage);
    updateDimensions();
    resetCamera();
    animate();
  });

  return <canvas ref={setCanvasRef} id="canvas"></canvas>;
};

export default Viewport;
