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

/*
const stages = [
  'Stage 0x02 Area 0x01', 'Stage 0x02 Area 0x02', 'Stage 0x02 Area 0x03',
  'Stage 0x03 Area 0x01', 'Stage 0x03 Area 0x02', 'Stage 0x03 Area 0x03',
  'Stage 0x03 Area 0x04', 'Stage 0x03 Area 0x05', 'Stage 0x0d Area 0x01',
  'Stage 0x0e Area 0x01', 'Stage 0x0e Area 0x02', 'Stage 0x0f Area 0x00',
  'Stage 0x0f Area 0x01', 'Stage 0x11 Area 0x02', 'Stage 0x12 Area 0x00',
  'Stage 0x12 Area 0x01', 'Stage 0x13 Area 0x00', 'Stage 0x13 Area 0x01',
  'Stage 0x13 Area 0x02', 'Stage 0x14 Area 0x00', 'Stage 0x14 Area 0x01',
  'Stage 0x17 Area 0x00', 'Stage 0x17 Area 0x01', 'Stage 0x17 Area 0x02',
  'Stage 0x17 Area 0x03', 'Stage 0x17 Area 0x04', 'Stage 0x17 Area 0x05',
  'Stage 0x18 Area 0x00', 'Stage 0x18 Area 0x01', 'Stage 0x18 Area 0x02',
  'Stage 0x18 Area 0x03', 'Stage 0x19 Area 0x00', 'Stage 0x19 Area 0x01',
  'Stage 0x19 Area 0x02', 'Stage 0x1a Area 0x01', 'Stage 0x1b Area 0x01',
  'Stage 0x1c Area 0x01', 'Stage 0x1c Area 0x02', 'Stage 0x1d Area 0x02',
  'Stage 0x1f Area 0x01', 'Stage 0x1f Area 0x02', 'Stage 0x25 Area 0x01',
  'Stage 0x25 Area 0x02', 'Stage 0x25 Area 0x03', 'Stage 0x26 Area 0x01',
  'Stage 0x27 Area 0x01', 'Stage 0x28 Area 0x01', 'Stage 0x28 Area 0x02',
  'Stage 0x29 Area 0x01', 'Stage 0x2f Area 0x00', 'Stage 0x2f Area 0x01',
  'Stage 0x30 Area 0x01', 'Stage 0x33 Area 0x01', 'Stage 0x35 Area 0x01',
  'Stage 0x35 Area 0x02', 'Stage 0x39 Area 0x01', 'Stage 0x3a Area 0x01',
  'Stage 0x3a Area 0x02', 'Stage 0x3c Area 0x00', 'Stage 0x3c Area 0x01',
  'Stage 0x3c Area 0x02', 'Stage 0x4b Area 0x01', 'Stage 0x4b Area 0x02',
  'Stage 0x52 Area 0x01', 'Stage 0x53 Area 0x01', 'Stage 0x53 Area 0x02',
  'Stage 0x53 Area 0x03', 'Stage 0x5c Area 0x01'
]
*/

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
	
	// const VRAM_MAGIC = 0x4d415256
	const GPU_MAGIC = 0x2d555047
	const BUS_MAGIC = 0x00737542

	// const mem_ofs = 0x32766
	let vram_ofs = -1
	let mem_ofs = -1

	for(let i = 0; i < buffer.byteLength - 0x100000; i++) {
		const magic = view.getUint32(i, true)

		if(mem_ofs === -1 && magic === BUS_MAGIC) {
			mem_ofs = i + 0x43
		}

		if(vram_ofs === -1 && magic === GPU_MAGIC) {
			vram_ofs = i + 8
		}

	}

	if(vram_ofs === -1 || mem_ofs === -1) {
		alert('Could not parse mem and vram, Swarry >,<;;')
		throw new Error('Could not interpret file as Duck Station sav');
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

	console.log('do eeet')

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
	stateDropdown!.value = name
	
	setFramebuffer(vram)
	setMemory(mem)

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

	keys.forEach( n => {
		const li = document.createElement('li')
		li.setAttribute('class', 'list-group-item')
		if(n === state.name) {
			li.classList.add('active')
			stateDropdown!.value = n
		}

		li.textContent = n
		stateSelect!.appendChild(li)
		li.addEventListener('click', handleListClick)
	})

	keys.forEach( (key:string) => {
		const opt = document.createElement('option')
		opt.setAttribute('value', key)
		opt.textContent = key
		stateDropdown!.appendChild(opt)
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
