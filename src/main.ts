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
import { saveAs } from 'file-saver';

// Tools

const screenshotTool = document.getElementById('tool-screenshot')
const skeletonTool = document.getElementById('tool-skeleton')
const gridTool = document.getElementById('tool-grid')
const resetTool = document.getElementById('tool-reset')

// State

let skelHelper: THREE.SkeletonHelper | null
const canvas = document.getElementById('canvas') as HTMLCanvasElement
const renderer = new THREE.WebGLRenderer({ 
	canvas,
	preserveDrawingBuffer: true
})
renderer.setClearColor(new THREE.Color(0), 0)
const aspect = window.innerWidth / window.innerHeight
const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000)
const scene = new THREE.Scene()
new OrbitControls(camera, canvas);

const grid = new THREE.GridHelper(100, 10);
scene.add(grid);

type MainMemory = {
	mesh : THREE.Mesh | null,
	mixer: THREE.AnimationMixer | null,
	clock: THREE.Clock
}

const mem: MainMemory = {
	mesh: null,
	mixer: null,
	clock: new THREE.Clock()
}

const resetScene = () => {

	const { children } = scene;
	children.forEach( (child) => {
		switch(child) {
		case grid:
			return;
		}

		scene.remove(child);
	})

}

// Functions

const resetCamera = () => {

	camera.position.z = 55;
	camera.position.y = 25;
	camera.position.x = 0;
	camera.lookAt(new THREE.Vector3(0, 0, 0));

}

const updateDimensions = () => {

	const width = window.innerWidth - 320
	const height = window.innerHeight
	renderer.setSize(width, height)
	camera.aspect = width / height;
    camera.updateProjectionMatrix();

}

const animate = () => {

	requestAnimationFrame(animate);
	if(mem.mixer) {
		const delta = mem.clock.getDelta()
        mem.mixer.update(delta)
	}
	renderer.render(scene, camera)

}

const setEntity = (mesh: THREE.SkinnedMesh) => {

	resetScene()

	if(mesh.skeleton) {
		skelHelper = new THREE.SkeletonHelper(mesh);
		mesh.add(skelHelper);
	}

	if(mesh.animations && mesh.animations.length) {
		const clip = mesh.animations[0];
		const mixer = new THREE.AnimationMixer(mesh as THREE.Object3D)
		const action = mixer.clipAction(clip, mesh as THREE.Object3D)
        action.play()
        mem.mixer = mixer

	}
	
	mem.mesh = mesh;
	scene.add(mesh)

}

// Events

skeletonTool!.addEventListener('click', () => {
	if(!skelHelper) {
		return
	}

	skelHelper.visible = !skelHelper.visible
})

screenshotTool!.addEventListener('click', async () => {

	const mime = "image/png";
	const url = renderer.domElement.toDataURL(mime);
	const res = await fetch(url)
	const blob = await res.blob()

	const name = (<any>window).mesh ? (<any>window).mesh.name : 'screenshot';
	saveAs(blob, `${name}.png`)
})

resetTool!.addEventListener('click', () => {
	resetCamera()
})

gridTool!.addEventListener('click', () => {
	grid.visible = !grid.visible
})


export { setEntity }

window.addEventListener('resize', updateDimensions)
updateDimensions()
resetCamera()
animate()
