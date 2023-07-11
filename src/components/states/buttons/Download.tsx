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

const Download = () => {
  const handleClick = () => {
    window.postMessage("download");
  };

  return (
    <li onClick={handleClick}>
      <a
        data-tooltip-target="download-tooltip"
        data-tooltip-placement="left"
        class="flex items-center p-2 text-gray-500 rounded-lg transition duration-75 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <svg
          class="w-6 h-6"
          aria-hidden="true"
          stroke="currentColor"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 16 18"
        >
          <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 1v11m0 0 4-4m-4 4L4 8m11 4v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-3"
          />
        </svg>
        <span class="sr-only"></span>
      </a>
      <div
        id="download-tooltip"
        role="tooltip"
        class="inline-block absolute invisible z-10 py-2 px-3 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 transition-opacity duration-300 tooltip"
      >
        Download
        <div class="tooltip-arrow" data-popper-arrow></div>
      </div>
    </li>
  );
};

export default Download;
