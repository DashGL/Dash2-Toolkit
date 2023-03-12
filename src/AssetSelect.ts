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


import { readEntity } from '@/ReadEntity'
import characterList from '@/characters.json'

interface characterInterface {
	[key: string]: string
}

const characters = characterList as characterInterface

// State

type AssetState = {
	mem: ArrayBuffer | null
	name: string
}

const state: AssetState = {
	mem: null,
	name: ''
}

const setMemory = (mem: ArrayBuffer) => {

	state.mem = mem
	renderAssetList()

}

const renderAssetList = () => {

	renderEntityList()

}

const renderEntityList = () => {
	
	const { name, mem } = state
	if(!mem) {
		return 
	}

	const ENTITY_OFFSET = 0x124800
	const ebdData = mem.slice(ENTITY_OFFSET)
	
	const view = new DataView(ebdData)
	const count = view.getUint32(0, true)

	const assetList = document.getElementById('asset-list')
	assetList!.classList.add('pop')
	const assetSelect = document.getElementById('asset-select')
	assetSelect!.innerHTML = ''

	let ofs = 4;
	for(let i = 0; i < count; i++) {
		
		const id = view.getUint32(ofs, true)
		const meshOfs = view.getUint32(ofs + 0x04, true)
		const tracksOfs = view.getUint32(ofs + 0x08, true)
		const controlOfs = view.getUint32(ofs + 0x0c, true)
		ofs += 0x10

		const li = document.createElement('li')
		li.setAttribute('class', 'list-group-item')
		const hexId = `0x${id.toString(16).padStart(6, '0')}`;
		const characterName = characters[hexId] || hexId

		if(hexId.slice(-2) !== '20') {
			continue
		}

		li.textContent = characterName
		li.addEventListener('click', (evt: Event) => {
			const { target } = evt
			const content = (target as HTMLElement).textContent
			state.name = content ? content : ''
			localStorage.setItem('asset-id', state.name)
			renderEntityList()
			readEntity(view, characterName, meshOfs, tracksOfs, controlOfs)
		})

		if(hexId === name) {
			li.classList.add('active')
			readEntity(view, characterName, meshOfs, tracksOfs, controlOfs)
		}

		assetSelect!.appendChild(li)
	}

}

export { setMemory }
