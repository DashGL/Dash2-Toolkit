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

// Imports

import pako from 'pako'
import localForage from 'localforage';
import { setMemory } from '/src/AssetSelect.ts'

// States

const state = {
	'name': ''
}

const store = localForage.createInstance({
  name: "MML2-StateViewer"
});

// DOM Elements 

const toggleButton = document.getElementById('toggle-btn')
const stateList = document.getElementById('state-list')
const assetList = document.getElementById('asset-list')
const fileSelect = document.getElementById('file-select')

// Event Listeners

toggleButton.addEventListener('click', ()=> {

	stateList.classList.toggle('hide')
	assetList.classList.toggle('hide')

})

const preventDefaults = (e: Event) => {
	e.preventDefault()
	e.stopPropagation()
}

const eventTypes = ['dragenter', 'dragover', 'dragleave', 'drop']
eventTypes.forEach(eventName => {
	assetList.addEventListener(eventName, preventDefaults)
})

const decompress = (buffer: ArrayBuffer) => {
	const GZIP_HEADER = 0x8b1f
	const view = new DataView(buffer)
	const header = view.getUint16(0, true)
	
	if(header !== GZIP_HEADER) {
		return buffer
	}
	
	const decompressed = pako.ungzip(buffer)
	return decompressed.buffer
}

const splitState = ( buffer: ArrayBuffer ) => {

	const mem_len = 0x200000
	const vram_len = 0x100000

	// PCSXR Save State
	const PCSXR_LEN = 0x431003
	if(buffer.byteLength === PCSXR_LEN) {
		const mem_ofs = 0x9025
		const vram_ofs = 0x29B749
		return {
			mem : buffer.slice(mem_ofs, mem_ofs + mem_len),
			vram : buffer.slice(vram_ofs, vram_ofs + vram_len)
		}
	}

	// Duck Station
	const view = new DataView(buffer)
	const VRAM_MAGIC = 0x4d415256
	const mem_ofs = 0x32766
	let vram_ofs = -1
	for(let i = 0; i < buffer.byteLength - 0x100000; i++) {
		const magic = view.getUint32(i, true)
		if(magic !== VRAM_MAGIC) {
			continue;
		}	
		vram_ofs = i + 4
		break
	}

	return {
		mem : buffer.slice(mem_ofs, mem_ofs + mem_len),
		vram : buffer.slice(vram_ofs, vram_ofs + vram_len)
	}

}

const getStateName = ( buffer: ArrayBuffer ) => {

	const stage_ofs = 0x9c808
	const area_ofs = 0x9c809

	const view = new DataView(buffer)
	const stage = view.getUint8(stage_ofs)
	const area = view.getUint8(area_ofs)
	
	const stageHex = stage.toString(16).padStart(2, '0')
	const areaHex = area.toString(16).padStart(2, '0')
	return `Stage 0x${stageHex} Area 0x${areaHex}`

}

const handleStateDrop = async (event: DragEvent) => {
	const { files } = event.dataTransfer	
	for(let i = 0; i < files.length; i++) {
		await handleFile(files[i], false)
	}
}

const handleAssetDrop = async (event: DragEvent) => {
	const { files } = event.dataTransfer	
	const { length } = files
	const file= files
	console.log(files)
	console.log(files.length)

	for(let i = 0; i < length; i++) {
		console.log(files[i])
		await handleFile(files[i], true)
	}
}

const handleFileSelect = async (event) => {
	const { files } = event.target
	const { length } = files
	const file= files
	console.log(files)
	console.log(files.length)

	for(let i = 0; i < length; i++) {
		console.log(files[i])
		await handleFile(files[i], true)
	}
}

const handleFile = async(file: File, setActive: boolean) => {
	const buffer = await file.arrayBuffer()
	const saveState = decompress(buffer)
	const { mem, vram } = splitState(saveState)
	const name = getStateName(mem)
	await store.setItem(name, { mem, vram })
	if(setActive) {
		await setState(name)
	}
	renderStateList(mem);
}

const setState = async (name: String) => {

	state.name = name;
	localStorage.setItem('savestate', name)
	const { mem, vram } = await store.getItem(name)
	setMemory(mem)

}

const renderStateList = async () => {

	const keys = await store.keys()
	keys.sort()
	const stateSelect = document.getElementById('state-select')
	stateSelect.innerHTML = ''

	const handleListClick = (event) => {
		const { target } = event
		const name = target.textContent
		setState(name)
		renderStateList()
	}

	keys.forEach( (key:String) => {
		const li = document.createElement('li')
		li.setAttribute('class', 'list-group-item')
		if(key === state.name) {
			li.classList.add('active')
		}
		li.textContent = key
		stateSelect.appendChild(li)
		li.addEventListener('click', handleListClick)
	})

}

const name = localStorage.getItem('savestate')
if(name) {
	setState(name)
}

renderStateList()
assetList.addEventListener('drop', handleAssetDrop)
stateList.addEventListener('drop', handleStateDrop)
fileSelect.addEventListener('change', handleFileSelect)

