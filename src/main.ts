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

import * as THREE from 'three'
import { OrbitControls } from '@three-ts/orbit-controls';

// State

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const renderer = new THREE.WebGLRenderer({ canvas })
renderer.setClearColor(new THREE.Color(0), 0)
const aspect = window.innerWidth / window.innerHeight
const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000)
const scene = new THREE.Scene()
const controls = new OrbitControls(camera, canvas);
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const cube = new THREE.Mesh(geometry, material);
// scene.add(cube);
const grid = new THREE.GridHelper(100, 10);
scene.add(grid);

// Functions

const resetCamera = () => {

	camera.position.z = 55;
	camera.position.y = 25;
	camera.position.x = 0;
	camera.lookAt(new THREE.Vector3(0, 25, 0));

}

const updateDimensions = () => {

	const width = window.innerWidth
	const height = window.innerHeight
	renderer.setSize(width, height)
	camera.aspect = width / height;
    camera.updateProjectionMatrix();

}

const animate = () => {

	requestAnimationFrame(animate);

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

	renderer.render(scene, camera)

}

const setEntity = (mesh: THREE.Mesh) => {

	scene.add(mesh)

}

export { setEntity }

window.addEventListener('resize', updateDimensions)
updateDimensions()
resetCamera()
animate()
