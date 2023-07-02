import type { SaveState } from "@scripts/state/types";
import pako from "pako";
import { addSaveState } from "@scripts/state/StateSelect";

const fileSelect = document.getElementById("file-select")!;

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

fileSelect.addEventListener("change", async (event: Event) => {
  const { files } = event!.target as HTMLInputElement;

  if (!files) {
    return;
  }

  const { length } = files;
  for (let i = 0; i < length; i++) {
    const file = files[i];
    const buffer = await file.arrayBuffer();
    const decompressed = decompress(buffer);
    const saveState = splitState(decompressed);
    addSaveState(saveState);
  }
});
