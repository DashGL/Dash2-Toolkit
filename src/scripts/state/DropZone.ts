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

import pako from "pako";
import type { SaveState } from "./types";

const fileSelect = document.getElementById("file-select")!;

document.addEventListener("DOMContentLoaded", () => {
  fileSelect.addEventListener("change", handleFileSelect);
});

const handleFileSelect = async (event: Event) => {
  const { files } = event!.target as HTMLInputElement;

  if (!files) {
    return;
  }

  const { length } = files;
  for (let i = 0; i < length; i++) {
    await handleFile(files[i], true);
  }
};

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

const getStateName = (buffer: ArrayBuffer) => {
  const stage_ofs = 0x9c808;
  const area_ofs = 0x9c809;

  const view = new DataView(buffer);
  const stage = view.getUint8(stage_ofs);
  const area = view.getUint8(area_ofs);

  const stageHex = stage.toString(16).padStart(2, "0");
  const areaHex = area.toString(16).padStart(2, "0");
  return `Stage 0x${stageHex} Area 0x${areaHex}`;
};

const handleFile = async (file: File, setActive: boolean) => {
  const buffer = await file.arrayBuffer();
  const decompressed = decompress(buffer);
  const saveState = splitState(decompressed);
  const { mem } = saveState;
  const name = getStateName(mem);
  console.log(name);
};
