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

import localForage from "localforage";
import type { SaveState } from "@scripts/state/types";

const store = localForage.createInstance({
    name: "MML2-StateViewer",
});

const stateDropdown = document.getElementById(
    "state-dropdown"
)! as HTMLSelectElement;

document.addEventListener("DOMContentLoaded", () => {});

/**
 * Return the stage and area from memory as a string
 * @param mem - The 2MB memory attribute from a save state
 * @returns name - A string representation of the stage and area as a string
 */
const getStateName = (mem: ArrayBuffer) => {
    const stage_ofs = 0x9c808;
    const area_ofs = 0x9c809;

    const view = new DataView(mem);
    const stage = view.getUint8(stage_ofs);
    const area = view.getUint8(area_ofs);

    const stageHex = stage.toString(16).padStart(2, "0");
    const areaHex = area.toString(16).padStart(2, "0");
    return `Stage 0x${stageHex} Area 0x${areaHex}`;
};

/**
 * Stores a save state into persistent storage to be able to be read on page reloads
 * 
 * @remarks
 * This function takes the stage and area from the memory to create an index for the save state
 * 
 * @param mem - A save state with 2MB of memory and 1MB of vram as separate array buffers
 * @returns null
 */
const addSaveState = async (
    saveState: SaveState
): Promise<void> => {
    const { mem } = saveState;
    const name = getStateName(mem);
    await store.setItem(name, saveState);
};

export { addSaveState };