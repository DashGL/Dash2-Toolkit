/**
 * This function takes the 2MB memory of a save states, seeks to the entity offset and then
 * returns a list of entities contained in the save state that can be rendered as assets
 * 
 * @param mem - 2MB buffer extracted 
 * @returns list - A list of entities with a name and their offsets in the memory
 */

import ByteReader from "bytereader";
import EntityNames from "../content/EntityNames.json"
import type { EntityHeader } from "./index"

const getEntityList = (mem: ArrayBuffer):EntityHeader[] => {
	
	const ENTITY_OFFSET = 0x124800
	const ebdData = mem.slice(ENTITY_OFFSET)
	
	const reader = new ByteReader(ebdData);
	const count = reader.readUInt32();

	const list:EntityHeader[] = [];

	for(let i = 0; i < count; i++) {
		
		const rawId = reader.readUInt32()
		const id = `0x${rawId.toString(16).padStart(6, '0')}`;
		const meshOfs = reader.readUInt32()
		const tracksOfs = reader.readUInt32()
		const controlOfs = reader.readUInt32()
		
		const character = EntityNames.find( entity => {
			return entity.id === id;
		});

		const name = character ? character.name : id;

		// Check if the if the id contains the flag indicating a character
		if(id.slice(-2) !== '20') {
			continue;
		}

		list.push({
			id,
			name,
			meshOfs,
			tracksOfs,
			controlOfs
		})

	}

	return list;
}

export default getEntityList;