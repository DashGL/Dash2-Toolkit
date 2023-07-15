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

import { For, createSignal, onMount } from "solid-js";
import { getEntityList } from "@scripts/index";
import type { EntityHeader } from "@scripts/index";

const [memName, setMemName] = createSignal("Save State");
const [selectName, setSelected] = createSignal("");
const [memory, setMemory] = createSignal<ArrayBuffer | undefined>();
const [entityList, setEntityList] = createSignal<EntityHeader[]>([]);

// CSS Constants for List Items

const listItem = [
  "flex",
  "items-center",
  "p-2",
  "pl-6",
  "w-full",
  "text-base",
  "font-medium",
  "text-gray-900",
  "rounded-lg",
  "transition",
  "duration-75",
  "group",
  "hover:cursor-pointer",
  "hover:bg-gray-100",
  "dark:text-white",
  "dark:hover:bg-gray-700",
];

const activeListItem = [...listItem, "bg-gray-100", "dark:bg-gray-700"];

const handleEntityClick = (entity: EntityHeader, li: HTMLLIElement) => {
  const mem = memory();
  setSelected(entity.name);

  const ul = document.getElementById("entity-list")!;
  ul.childNodes.forEach((elem) => {
    if (elem.nodeName !== "LI") {
      return;
    }

    const item = elem as HTMLLIElement;
    item.setAttribute("class", listItem.join(" "));
  });

  li.setAttribute("class", activeListItem.join(" "));
  window.postMessage({
    type: "Entity",
    mem,
    entity,
  });
};

const AssetList = () => {
  return (
    <div>
      <ul class="space-y-2" id="asset-list">
        <li>
          <h3 class="flex items-center p-2 w-full text-base font-medium text-gray-900 rounded-lg group dark:text-white uppercase border-b border-gray-200 dark:border-gray-700">
            Entities
          </h3>
          <ul id="entity-list" class="py-2 space-y-2">
            <For each={entityList()}>
              {(e) => (
                <li
                  onClick={(event: MouseEvent) => {
                    const { target } = event;
                    const li = target! as HTMLLIElement;
                    handleEntityClick(e, li);
                  }}
                  class={
                    selectName() === e.name
                      ? activeListItem.join(" ")
                      : listItem.join(" ")
                  }
                >
                  {e.name}
                </li>
              )}
            </For>
          </ul>
        </li>
        {/*
          <li>
          <button
            type="button"
            class="flex items-center p-2 w-full text-base font-medium text-gray-900 rounded-lg transition duration-75 group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
            aria-controls="dropdown-acquisition"
            data-collapse-toggle="dropdown-acquisition"
          >
            <span class="flex-1 text-left whitespace-nowrap">Player</span>
            <svg
              aria-hidden="true"
              class="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>
          <ul id="dropdown-acquisition" class="py-2 space-y-2">
            <li>
              <a
                href="#"
                class="flex items-center p-2 pl-6 w-full text-base font-medium text-gray-900 rounded-lg transition duration-75 group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
              >
                Overview
              </a>
            </li>
          </ul>
        </li>
        <li>
          <button
            type="button"
            class="flex items-center p-2 w-full text-base font-medium text-gray-900 rounded-lg transition duration-75 group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
            aria-controls="dropdown-sales"
            data-collapse-toggle="dropdown-sales"
          >
            <span class="flex-1 text-left whitespace-nowrap">Stage</span>
            <svg
              aria-hidden="true"
              class="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>
          <ul id="dropdown-sales" class="py-2 space-y-2">
            <li>
              <a
                href="#"
                class="flex items-center p-2 pl-6 w-full text-base font-medium text-gray-900 rounded-lg transition duration-75 group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
              >
                Overview
              </a>
            </li>
          </ul>
        </li>
          */}
      </ul>
    </div>
  );
};

/**
 *
 * Sets the save state to scan for assets which will appear as clickable items in the component
 *
 * @param name - The name of the save state as defined by the state and area to act as a label
 * @param mem - The 2MB of main memory from a Save State to search for assets
 * @returns null
 *
 */

const scanMemory = (name: string, mem: ArrayBuffer): void => {
  setMemName(name);
  setMemory(mem);

  const entities = getEntityList(mem);
  setEntityList(entities);

  // Manually re-render because solidjs won't update?

  const eList = document.getElementById("entity-list")!;
  eList.innerHTML = "";
  entities.forEach((e) => {
    const li = document.createElement("li");
    li.textContent = e.name;
    li.setAttribute("class", listItem.join(" "));
    eList.appendChild(li);
    li.addEventListener("click", (event: MouseEvent) => {
      const { target } = event;
      const li = target! as HTMLLIElement;
      handleEntityClick(e, li);
    });
  });
};

export default AssetList;
export { memName, memory, scanMemory };
