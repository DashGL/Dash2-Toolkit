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
import type { SaveState } from "./types";

const store = localForage.createInstance({
  name: "MML2-StateViewer",
});

const setState = async (name: string) => {
  const saveState = await store.getItem(name);
  if (!saveState) {
    return;
  }

  const { mem, vram } = saveState as SaveState;
  stateDropdown.value = name;
};
