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
import { setMemory } from '@/AssetSelect'
import { setFramebuffer } from '@/Frambuffer'

// States

type SaveState = {
	mem: ArrayBuffer
	vram: ArrayBuffer
}

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
const fileTrigger = document.getElementById('file-trigger')
const stateDropdown = document.getElementById('state-dropdown') as HTMLSelectElement

// Event Listeners

toggleButton!.addEventListener('click', ()=> {

	stateList!.classList.toggle('hide')
	assetList!.classList.toggle('hide')

})

const preventDefaults = (e: Event) => {
	e.preventDefault()
	e.stopPropagation()
}

const eventTypes = ['dragenter', 'dragover', 'dragleave', 'drop']
eventTypes.forEach(eventName => {
	assetList!.addEventListener(eventName, preventDefaults)
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

const splitState = ( buffer: ArrayBuffer ):SaveState => {

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
	const { dataTransfer } = event
	if(!dataTransfer) {
		return
	}

	const { files } = dataTransfer	
	for(let i = 0; i < files.length; i++) {
		await handleFile(files[i], false)
	}
}

const handleAssetDrop = async (event: DragEvent) => {
	const { dataTransfer } = event
	if(!dataTransfer) {
		return
	}

	const { files } = dataTransfer	
	for(let i = 0; i < files.length; i++) {
		await handleFile(files[i], false)
	}
}

const handleFileSelect = async (event: Event) => {
	const { files } = event!.target as HTMLInputElement

	if(!files) {
		return
	}
	
	const { length } = files
	for(let i = 0; i < length; i++) {
		await handleFile(files[i], true)
	}
}

const handleFile = async(file: File, setActive: boolean) => {
	const buffer = await file.arrayBuffer()
	const decompressed = decompress(buffer)
	const saveState = splitState(decompressed)
	const { mem } = saveState
	const name = getStateName(mem)
	await store.setItem(name, saveState)
	if(setActive) {
		await setState(name)
	}
	renderStateList();
}

const setState = async (name: string) => {

	state.name = name;
	localStorage.setItem('savestate', name)
	const saveState = await store.getItem(name)
	if(!saveState) {
		return
	}

	const { mem, vram } = saveState as SaveState
	setMemory(mem)
	setFramebuffer(vram)
	stateDropdown!.value = name

}

const renderStateList = async () => {

	const keys = await store.keys()
	keys.sort()
	const stateSelect = document.getElementById('state-select')
	stateSelect!.innerHTML = ''
	stateDropdown!.innerHTML = ''

	const handleListClick = (event: Event) => {
		const { target } = event
		const name = (target as HTMLElement).textContent
		setState(name as string)
		renderStateList()
	}

	keys.forEach( (key:string) => {
		const opt = document.createElement('option')
		opt.setAttribute('value', key)
		opt.textContent = key
		stateDropdown!.appendChild(opt)

		const li = document.createElement('li')
		li.setAttribute('class', 'list-group-item')
		if(key === state.name) {
			li.classList.add('active')
			stateDropdown!.value = key
		}

		li.textContent = key
		stateSelect!.appendChild(li)
		li.addEventListener('click', handleListClick)
	})


}

const name = localStorage.getItem('savestate')
if(name) {
	setState(name)
}

renderStateList()
assetList!.addEventListener('drop', handleAssetDrop)
stateList!.addEventListener('drop', handleStateDrop)
fileSelect!.addEventListener('change', handleFileSelect)
stateDropdown!.addEventListener('change', () => {
	setState(stateDropdown!.value)
})

fileTrigger!.addEventListener('click', () => {
	fileSelect!.click()
})
