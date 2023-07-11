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

const Reset = () => {
  const handleClick = () => {
    window.postMessage("reset");    
  };

  return (
    <li onClick={handleClick}>
      <a
        data-tooltip-target="reset-tooltip"
        data-tooltip-placement="left"
        class="flex items-center p-2 text-gray-500 rounded-lg transition duration-75 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <svg
          class="w-6 h-6"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 20 14"
          stroke="currentColor"
        >
          <path
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 1H2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1Zm7 11-6-2V4l6-2v10Z"
          />
        </svg>
        <span class="sr-only"></span>
      </a>
      <div
        id="reset-tooltip"
        role="tooltip"
        class="inline-block absolute invisible z-10 py-2 px-3 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 transition-opacity duration-300 tooltip"
      >
        Reset Camera
        <div class="tooltip-arrow" data-popper-arrow></div>
      </div>
    </li>
  );
};

export default Reset;
