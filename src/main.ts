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

const controls = document.getElementById('anim.controls')
const select = document.getElementById('anim.select')
const play = document.getElementById('anim.play')
const pause = document.getElementById('anim.pause')
const stop = document.getElementById('anim.stop')
const next = document.getElementById('anim.next')
const prev = document.getElementById('anim.prev')
const frame = document.getElementById('anim.frame')

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
	action: THREE.AnimationAction | null,
	clock: THREE.Clock
}

const mem: MainMemory = {
	mesh: null,
	mixer: null,
	action: null,
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
	mem.mesh = mesh;

	if(mesh.skeleton) {
		skelHelper = new THREE.SkeletonHelper(mesh);
		mesh.add(skelHelper);
	}

	if(mesh.animations && mesh.animations.length) {
		controls!.classList.remove('hide')
		select!.innerHTML = '<option value="null">Select Animation</option>'
		for(let i = 0; i < mesh.animations.length; i++){
			const opt = document.createElement('option');
			opt.value = i.toString();
			opt.textContent = `anim_${i.toString().padStart(3,'0')}`
			select!.appendChild(opt);
		}
	} else {
		controls!.classList.add('hide')
	}
	
	
	scene.add(mesh)

}

// Events

const startAnim = (index:number | null) => {
	const { mesh } = mem ;
	if(!mesh) {
		return;
	}

	if(mem.action) {
		mem.action.stop();
	}

	if(index === null) {
		return;
	}

	console.log(index);
	const clip = mesh.animations[index];
	const mixer = new THREE.AnimationMixer(mesh as THREE.Object3D)
	const action = mixer.clipAction(clip, mesh as THREE.Object3D)
    action.play()
	mem.action = action
    mem.mixer = mixer
}

select!.addEventListener('input', ()=> {
	
	const value = parseInt((select as HTMLSelectElement)!.value);	
	startAnim(value);

})

play!.addEventListener('click', () =>{
	const { action } = mem;
	if(!action) {
		return;
	}
	action.play();
	action.paused = false;
});

pause!.addEventListener('click', () =>{
	const { action } = mem;
	if(!action) {
		return;
	}
	action.paused = true;
})

stop!.addEventListener('click', () =>{
	const { action } = mem;
	if(!action) {
		return;
	}
	action.stop();
})

next!.addEventListener('click', () =>{
	const { mesh } = mem ;
	if(!mesh) {
		return;
	}

	const len = mesh.animations.length;
	if(len === 0){
		return;
	}

	const e = select as HTMLSelectElement
	const value = parseInt(e!.value);
	
	if(value === len - 1){
		return;
	}

	if(value === null) {
		e!.value = '0';	
		startAnim(0);
	}

	e!.value = (value + 1).toString(); 
	startAnim(value + 1);
})

prev!.addEventListener('click', () =>{

	const { mesh } = mem ;
	if(!mesh) {
		return;
	}

	const len = mesh.animations.length;
	if(len === 0){
		return;
	}

	const e = select as HTMLSelectElement
	const value = parseInt(e!.value);
	
	if(value === null) {
		return;
	}

	if(value === 0){
		e!.value = 'null';	
		startAnim(null);
		return;
	}

	e!.value = (value - 1).toString();
	startAnim(value - 1);

});

frame!.addEventListener('click', () =>{
	console.log('select updated')
})

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
