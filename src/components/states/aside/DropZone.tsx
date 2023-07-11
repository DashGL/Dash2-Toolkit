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

import { createSignal } from "solid-js";
import { useDropZone } from "solidjs-use";
import { addSaveState } from "./SelectState";

const DropZone = () => {
  const [dropZoneRef, setDropZoneRef] = createSignal<HTMLDivElement>();

  const onDrop = async (files: File[] | null) => {
    // called when files are dropped on zone
    if (!files) {
      return;
    }

    console.log("Dropped!!!");
    for (let i = 0; i < files.length; i++) {
      console.log("Adding save");
      await addSaveState(files[i]);
    }
  };

  const onChange = async (evt: Event) => {
    const { target } = evt;
    const t = target as HTMLInputElement;
    const { files } = t;

    if (!files) {
      return;
    }

    const { length } = files;
    for (let i = 0; i < length; i++) {
      await addSaveState(files[i]);
    }
  };

  const { isOverDropZone } = useDropZone(dropZoneRef, onDrop);

  return (
    <div
      ref={setDropZoneRef}
      class="flex items-center justify-center"
    >
      <label
        for="file-select"
        class="flex flex-col px-4 items-center justify-center w-full h-10 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
      >
        <div class="flex flex-row items-center justify-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            <span class="font-semibold">Click to upload</span> or drag and drop
          </p>
        </div>
        <input id="file-select" onChange={onChange} type="file" class="hidden" />
      </label>
    </div>
  );
};

export default DropZone;
