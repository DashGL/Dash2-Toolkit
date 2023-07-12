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

import type { SaveState } from "@scripts/index";
import localForage from "localforage";
import { For, createSignal } from "solid-js";
import { scanMemory } from "./AssetList";
import pako from "pako";
import { setFramebuffer } from "@scripts/Framebuffer";

const store = localForage.createInstance({
  name: "MML2-StateViewer",
});

const nullOption = "Select State";
const [list, setList] = createSignal([nullOption]);
const [value, setValue] = createSignal(nullOption);

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
 *
 * Checks to see if a buffer is compressed, and decompresses it with GZip
 *
 * @param buffer - The input buffer
 * @returns buffer - The decompressed buffer
 *
 */
const decompress = (buffer: ArrayBuffer) => {
  const GZIP_HEADER = 0x8b1f;
  const view = new DataView(buffer);
  const header = view.getUint16(0, true);

  if (header !== GZIP_HEADER) {
    return buffer;
  }

  const decompressed = pako.ungzip(buffer);
  return decompressed.buffer;
};

/**
 * Splits a save state into it's memory and vram components
 *
 * @remarks
 * This currently only supports DuckStation and PCSX save states
 *
 * @param buffer - The decompressed save state
 * @returns saveState - An object with 2MB memory and 1MB vram as their own arraybuffers
 */

const splitState = (buffer: ArrayBuffer): SaveState => {
  const mem_len = 0x200000;
  const vram_len = 0x100000;

  // PCSXR Save State
  const PCSXR_LEN = 0x431003;
  if (buffer.byteLength === PCSXR_LEN) {
    const mem_ofs = 0x9025;
    const vram_ofs = 0x29b749;
    return {
      mem: buffer.slice(mem_ofs, mem_ofs + mem_len),
      vram: buffer.slice(vram_ofs, vram_ofs + vram_len),
    };
  }

  // Duck Station
  const view = new DataView(buffer);

  // const VRAM_MAGIC = 0x4d415256
  const GPU_MAGIC = 0x2d555047;
  const BUS_MAGIC = 0x00737542;

  // const mem_ofs = 0x32766
  let vram_ofs = -1;
  let mem_ofs = -1;

  for (let i = 0; i < buffer.byteLength - 0x100000; i++) {
    const magic = view.getUint32(i, true);

    if (mem_ofs === -1 && magic === BUS_MAGIC) {
      mem_ofs = i + 0x43;
    }

    if (vram_ofs === -1 && magic === GPU_MAGIC) {
      vram_ofs = i + 8;
    }
  }

  if (vram_ofs === -1 || mem_ofs === -1) {
    alert("Could not parse mem and vram, Swarry >,<;;");
    throw new Error("Could not interpret file as Duck Station sav");
  }

  return {
    mem: buffer.slice(mem_ofs, mem_ofs + mem_len),
    vram: buffer.slice(vram_ofs, vram_ofs + vram_len),
  };
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

const addSaveState = async (file: File): Promise<void> => {
  const buffer = await file.arrayBuffer();
  const decompressed = decompress(buffer);
  const saveState = splitState(decompressed);
  const { mem, vram } = saveState;
  const name = getStateName(mem);
  await store.setItem(name, saveState);
  const keys = await store.keys();
  keys.sort();
  const list = [nullOption, ...keys];
  setList(list);
  setValue(name);
  setFramebuffer(vram);
  scanMemory(name, mem);
};

const setSelectedIndex = async (evt: Event) => {
  // Get the name of the selected Save State

  const { target } = evt;
  const t = target as HTMLSelectElement;
  const name = t.value;

  // Update the Solidjs Signal for the UI
  setValue(name);

  // Get the save state from LocalForage
  const saveState = (await store.getItem(name)) as SaveState;
  const { mem, vram } = saveState;
  setFramebuffer(vram);
  scanMemory(name, mem);
};

const StateSelect = () => {
  return (
    <select
      onChange={setSelectedIndex}
      value={value()}
      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
    >
      <For each={list()}>{(li) => <option>{li}</option>}</For>
    </select>
  );
};

export default StateSelect;
export { addSaveState };
