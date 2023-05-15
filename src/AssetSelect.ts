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


import { Entity } from '@/ReadEntity'
import { setEntity } from '@/main'
import characterList from '@/characters.json'
import ByteReader from 'bytereader'

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
	
	const reader = new ByteReader(ebdData);
	const count = reader.readUInt32();

	const assetList = document.getElementById('asset-list')
	assetList!.classList.add('pop')
	const assetSelect = document.getElementById('asset-select')
	assetSelect!.innerHTML = ''

	for(let i = 0; i < count; i++) {
		
		const id = reader.readUInt32()
		const meshOfs = reader.readUInt32()
		const tracksOfs = reader.readUInt32()
		const controlOfs = reader.readUInt32()
		
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
			
			const e = new Entity(reader);
			const mesh = e.parseMesh(meshOfs);
			mesh.name = name

			if(tracksOfs && controlOfs) {
				e.parseAnimation(tracksOfs, controlOfs); 
			}

			setEntity(mesh)
		})

		if(hexId === name) {
			li.classList.add('active')
		}

		assetSelect!.appendChild(li)
	}

}

export { setMemory }
