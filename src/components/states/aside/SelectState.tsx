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

import type { SaveState } from "@scripts/state/types";
import localForage from "localforage";
import { For, createSignal } from "solid-js";

const store = localForage.createInstance({
  name: "MML2-StateViewer",
});

const nullOption = "Select State";
const [list, setList] = createSignal(["nullOption"]);
const [selectedIndex, setIndex] = createSignal(0);

store.keys().then((keys) => {
  keys.sort();
  setList([nullOption, ...keys]);
});

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
const addSaveState = async (saveState: SaveState): Promise<void> => {
  const { mem } = saveState;
  const name = getStateName(mem);
  await store.setItem(name, saveState);
  const keys = await store.keys();
  keys.sort();
  const list = [nullOption, ...keys];
  setList(list);
  const nameIndex = keys.indexOf(name);
  setIndex(nameIndex);
};

const setSelectedIndex = (evt: Event) => {
  const { target } = evt;
  const t = target as HTMLSelectElement;
  const index = t.selectedIndex;
  console.log(t.value);
  console.log(index);
  setIndex(index);
}

const StateSelect = () => {
  return (
    <div class="block relative">
      <select onChange={setSelectedIndex} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
        <For each={list()}>
          {(li, index) => {
            return index() === selectedIndex() ? (
              <option selected>{li}</option>
            ) : (
              <option>{li}</option>
            );
          }}
        </For>
      </select>
    </div>
  );
};

export default StateSelect;
export { addSaveState };
