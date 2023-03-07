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

type FramebufferState = {
	vram: ArrayBuffer | null
}

const state: FramebufferState = {
	vram: null
}

const setFramebuffer = (vram: ArrayBuffer) => {
	state.vram = vram
}


const renderTexture = (imageCoords: number, paletteCoords: number) => {
	
	const { vram } = state
	if(!vram) {
		return
	}

	const view = new DataView(vram);
	const canvas = document.createElement("canvas");
	canvas.width = 256;
	canvas.height = 256;
	const ctx = canvas.getContext('2d');

	const image_x = (imageCoords & 0x0f) << 6;
	const image_y = imageCoords & 0x10 ? 0x100 : 0;

	const pallet_x = (paletteCoords & 0x3f) << 4;
	const pallet_y = paletteCoords >> 6;

	// Read the palettes

	let ofs = pallet_y * 1024 * 2;
	ofs += pallet_x * 2;

	const palette = new Array(16);
	for(let i = 0; i < 16; i++) {

		const  color = view.getUint16(ofs, true);
		const r = ((color >> 0x00) & 0x1f) << 3;
		const g = ((color >> 0x05) & 0x1f) << 3;
		const b = ((color >> 0x0a) & 0x1f) << 3;
		const a = color > 0 ? 1 : 0;
		palette[i] = `rgba(${r}, ${g}, ${b}, ${a})`;
		ofs += 2;

	}

	// Read the body

	for(let y = 0; y < 256; y++) {

		ofs = (image_y+y) * 1024 * 2;
		ofs += image_x * 2;
		
		for(let x = 0; x < 256; x+=2) {
			
			let px = view.getUint8(ofs);
			ofs++
			
			const low = palette[px & 0x0f];
			ctx!.fillStyle = low;
			ctx!.fillRect(x, y, 1, 1);
			
			const high = palette[px >> 4];
			ctx!.fillStyle = high;
			ctx!.fillRect(x + 1, y, 1, 1);

		}
		

	}

	return canvas;
}


export { renderTexture, setFramebuffer }
