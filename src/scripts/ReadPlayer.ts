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

import {
    Bone,
    BufferGeometry,
    Float32BufferAttribute,
    Matrix4,
    MeshBasicMaterial,
    Skeleton,
    SkinnedMesh,
    Uint16BufferAttribute,
    Vector3,
    Texture,
    Euler,
    Quaternion,
    AnimationClip,
} from "three";

import { renderTexture } from "./Framebuffer";
import ByteReader from "bytereader";

const SCALE = 0.00125;
const ROT = new Matrix4();
ROT.makeRotationX(Math.PI);

class Player {
    private reader: ByteReader;

    constructor(mem: ArrayBuffer) {
        const PLAYER_OFFSET = 0x110800
        const pbdData = mem.slice(PLAYER_OFFSET)
        this.reader = new ByteReader(pbdData);
    }

    parseMesh() {

        const startOfs = 0x1830;
        const endOfs = 0x1860;

        const list: Vector3[] = [];

        this.reader.seek(startOfs)
        for (let i = 0; i < 8; i++) {

            console.log(this.reader.tellf())
            const x = this.reader.readInt16();
            const y = this.reader.readInt16();
            const z = this.reader.readInt16();
            
            const vec3 = new Vector3(x, y, z);
            vec3.multiplyScalar(SCALE);
            // vec3.applyMatrix4(ROT);
            console.log(vec3);

            list.push(vec3);
        }

        return list;
    }

}

export { Player };