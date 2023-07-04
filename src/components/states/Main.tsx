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

const [canvasRef, setCanvasRef] = createSignal<HTMLCanvasElement>();

let skelHelper: THREE.SkeletonHelper | null;

type MainMemory = {
  mesh: THREE.Mesh | null;
  mixer: THREE.AnimationMixer | null;
  action: THREE.AnimationAction | null;
  clock: THREE.Clock;
  canvas: HTMLCanvasElement | null;
  renderer: THREE.WebGLRenderer | null;
  camera: THREE.PerspectiveCamera | null;
  scene: THREE.Scene | null;
};

const viewer: MainMemory = {
  mesh: null,
  mixer: null,
  action: null,
  clock: new THREE.Clock(),
  canvas: null,
  renderer: null,
  camera: null,
  scene: null,
};

// State

const resetScene = () => {
  const { children } = viewer.scene!;
  children.forEach((child) => {
    switch (child.name) {
      case "grid":
        return;
    }

    viewer.scene!.remove(child);
  });
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
  viewer.renderer!.setSize(width, height);
  viewer.camera!.aspect = width / height;
  viewer.camera!.updateProjectionMatrix();
};

const animate = () => {
  requestAnimationFrame(animate);
  if (viewer.mixer) {
    const delta = viewer.clock.getDelta();
    viewer.mixer.update(delta);
  }
  viewer.renderer!.render(viewer.scene!, viewer.camera!);
};

const setEntity = (mesh: THREE.SkinnedMesh) => {
  resetScene();
  viewer.mesh = mesh;
  if (mesh.skeleton) {
    skelHelper = new THREE.SkeletonHelper(mesh);
    mesh.add(skelHelper);
  }
  if (mesh.animations && mesh.animations.length) {
    for (let i = 0; i < mesh.animations.length; i++) {
      const opt = document.createElement("option");
      opt.value = i.toString();
      opt.textContent = `anim_${i.toString().padStart(3, "0")}`;
    }
  }
  viewer.scene!.add(mesh);
};

const Viewport = () => {
  onMount(() => {
    const canvas = canvasRef()!;
    viewer.canvas = canvas;
    viewer.renderer = new THREE.WebGLRenderer({
      canvas,
      preserveDrawingBuffer: true,
    });

    viewer.renderer.setClearColor(new THREE.Color(0), 0);
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    viewer.camera = camera;
    const scene = new THREE.Scene();
    viewer.scene = scene;
    new OrbitControls(camera, canvas);

    const grid = new THREE.GridHelper(100, 10);
    grid.name = "grid";
    scene.add(grid);

    window.addEventListener("resize", updateDimensions);
    updateDimensions();
    resetCamera();
    animate();
  });

  return (
    <main
      class="bg-gray-50 dark:bg-gray-900 fixed top-[3.5rem] h-full"
      style="width: calc(100% - 320px); left: 256px"
    >
      <canvas ref={setCanvasRef} id="canvas"></canvas>
    </main>
  );
};

export default Viewport;
export { setEntity };
