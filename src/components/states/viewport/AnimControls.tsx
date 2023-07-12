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

import { For, createSignal } from "solid-js";

const nullOption = "Choose an Animation";
const list = [nullOption];
const [value, setValue] = createSignal(nullOption);

const setAnimationList = (anims: THREE.AnimationClip[]) => {
  setValue(nullOption);
  while (list.length > 1) {
    list.pop();
  }

  for (let i = 0; i < anims.length; i++) {
    const name = `anim_${i.toString().padStart(3, "0")}`;
    list.push(name);
  }

  const select = document.getElementById("anim_select")! as HTMLSelectElement;
  select.innerHTML = "";
  list.forEach((name) => {
    const opt = document.createElement("option");
    opt.textContent = name;
    select.appendChild(opt);
  });
};

const AnimControls = () => {
  const handlePlayClick = () => {
    window.postMessage({
      type: "Play",
    });
  };

  const handlePauseClick = () => {
    window.postMessage({
      type: "Pause",
    });
  };

  const handleNextClick = () => {
    const select = document.getElementById("anim_select")! as HTMLSelectElement;
    const index = select.selectedIndex;

    if (index === select.length - 1) {
      return;
    }

    select.selectedIndex = index + 1;
    window.postMessage({
      type: "Animation",
      index,
    });
  };

  const handlePrevClick = () => {
    const select = document.getElementById("anim_select")! as HTMLSelectElement;
    const index = select.selectedIndex;

    if (index === 0) {
      return;
    }

    select.selectedIndex = index - 1;
    window.postMessage({
      type: "Animation",
      index: index - 2,
    });
  };

  const setSelectedIndex = () => {
    const select = document.getElementById("anim_select")! as HTMLSelectElement;
    const index = select.selectedIndex - 1;
    console.log(index);

    window.postMessage({
      type: "Animation",
      index,
    });
  };

  return (
    <section class="absolute w-full flex align-center justify-around left-0 bottom-4 z-20 list-none">
      <div>
        <select
          id="anim_select"
          onChange={setSelectedIndex}
          value={value()}
          class="block py-2.5 px-0 w-full text-sm text-gray-500 bg-transparent border-0 border-b-2 border-gray-200 appearance-none dark:text-gray-400 dark:border-gray-700 focus:outline-none focus:ring-0 focus:border-gray-200 peer"
        >
          <For each={list}>{(li) => <option>{li}</option>}</For>
        </select>
      </div>

      <li onClick={handlePlayClick}>
        <a
          data-tooltip-target="play-tooltip"
          data-tooltip-placement="top"
          class="flex items-center p-2 text-gray-500 rounded-lg transition duration-75 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg
            class="w-5 h-5"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            stroke="currentColor"
            viewBox="0 0 14 16"
          >
            <path d="M0 .984v14.032a1 1 0 0 0 1.506.845l12.006-7.016a.974.974 0 0 0 0-1.69L1.506.139A1 1 0 0 0 0 .984Z"></path>
          </svg>
          <span class="sr-only"></span>
        </a>
        <div
          id="play-tooltip"
          role="tooltip"
          class="inline-block absolute invisible z-10 py-2 px-3 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 transition-opacity duration-300 tooltip"
        >
          Play
          <div class="tooltip-arrow" data-popper-arrow></div>
        </div>
      </li>

      <li onClick={handlePauseClick}>
        <a
          data-tooltip-target="pause-tooltip"
          data-tooltip-placement="top"
          class="flex items-center p-2 text-gray-500 rounded-lg transition duration-75 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg
            class="w-5 h-5"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            stroke="currentColor"
            viewBox="0 0 10 16"
          >
            <path
              fill-rule="evenodd"
              d="M0 .8C0 .358.32 0 .714 0h1.429c.394 0 .714.358.714.8v14.4c0 .442-.32.8-.714.8H.714a.678.678 0 0 1-.505-.234A.851.851 0 0 1 0 15.2V.8Zm7.143 0c0-.442.32-.8.714-.8h1.429c.19 0 .37.084.505.234.134.15.209.354.209.566v14.4c0 .442-.32.8-.714.8H7.857c-.394 0-.714-.358-.714-.8V.8Z"
              clip-rule="evenodd"
            ></path>
          </svg>
          <span class="sr-only"></span>
        </a>
        <div
          id="pause-tooltip"
          role="tooltip"
          class="inline-block absolute invisible z-10 py-2 px-3 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 transition-opacity duration-300 tooltip"
        >
          Pause
          <div class="tooltip-arrow" data-popper-arrow></div>
        </div>
      </li>

      <li onClick={handlePrevClick}>
        <a
          data-tooltip-target="prev-tooltip"
          data-tooltip-placement="top"
          class="flex items-center p-2 text-gray-500 rounded-lg transition duration-75 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg
            class="w-5 h-5"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 12 16"
          >
            <path d="M10.819.4a1.974 1.974 0 0 0-2.147.33l-6.5 5.773A2.014 2.014 0 0 0 2 6.7V1a1 1 0 0 0-2 0v14a1 1 0 1 0 2 0V9.3c.055.068.114.133.177.194l6.5 5.773a1.982 1.982 0 0 0 2.147.33A1.977 1.977 0 0 0 12 13.773V2.227A1.977 1.977 0 0 0 10.819.4Z"></path>
          </svg>
          <span class="sr-only"></span>
        </a>
        <div
          id="prev-tooltip"
          role="tooltip"
          class="inline-block absolute invisible z-10 py-2 px-3 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 transition-opacity duration-300 tooltip"
        >
          Previous
          <div class="tooltip-arrow" data-popper-arrow></div>
        </div>
      </li>

      <li onClick={handleNextClick}>
        <a
          data-tooltip-target="next-tooltip"
          data-tooltip-placement="top"
          class="flex items-center p-2 text-gray-500 rounded-lg transition duration-75 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg
            class="w-5 h-5"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 12 16"
          >
            <path d="M11 0a1 1 0 0 0-1 1v5.7a2.028 2.028 0 0 0-.177-.194L3.33.732A2 2 0 0 0 0 2.227v11.546A1.977 1.977 0 0 0 1.181 15.6a1.982 1.982 0 0 0 2.147-.33l6.5-5.773A1.88 1.88 0 0 0 10 9.3V15a1 1 0 1 0 2 0V1a1 1 0 0 0-1-1Z"></path>
          </svg>
          <span class="sr-only"></span>
        </a>
        <div
          id="next-tooltip"
          role="tooltip"
          class="inline-block absolute invisible z-10 py-2 px-3 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 transition-opacity duration-300 tooltip"
        >
          Next
          <div class="tooltip-arrow" data-popper-arrow></div>
        </div>
      </li>
    </section>
  );
};

export default AnimControls;
export { setAnimationList };
