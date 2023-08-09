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
    MeshNormalMaterial,
    Mesh,
    TextureLoader,
} from "three";

import { renderTexture } from "./Framebuffer";
import ByteReader from "bytereader";

type FaceIndex = {
    materialIndex: number;
    boneIndex: number;
    x: number;
    y: number;
    z: number;
    u: number;
    v: number;
};

const PLAYER_OFFSET = 0x110800
const SCALE = 0.00125;
const ROT = new Matrix4();
ROT.makeRotationX(Math.PI);


class Player {
    private reader: ByteReader;
    private faces: FaceIndex[] = [];

    constructor(mem: ArrayBuffer) {
        const pbdData = mem.slice(PLAYER_OFFSET)
        this.reader = new ByteReader(pbdData);
    }

    parseMesh() {
        const texture = new TextureLoader().load('/mx-1.png');
        texture.flipY = false;
        texture.needsUpdate = true;

        const mat = new MeshBasicMaterial({ map: texture });
        this.readHead();

        const geometry = this.createBufferGeometry();
        const mesh = new Mesh(geometry, mat);
        return mesh
    }

    readHead() {
        const HEAD_OFFSET = 0x111360
        const startOfs = HEAD_OFFSET - PLAYER_OFFSET;
        const submeshCount = 3;

        this.reader.seek(startOfs);
        for (let i = 0; i < submeshCount; i++) {
            console.log(this.reader.tellf())
            const triCount = this.reader.readUInt8();
            const quadCount = this.reader.readUInt8();
            const vertCount = this.reader.readUInt8();
            this.reader.seekRel(1);

            const triOfs = this.reader.readUInt32();
            const quadOfs = this.reader.readUInt32();
            const vertOfs = this.reader.readUInt32();
            this.reader.seekRel(8);

            const save = this.reader.tell();

            this.reader.seek(vertOfs);
            const verts = this.readVertex(vertCount);

            this.reader.seek(triOfs);
            this.readFace(triCount, false, verts);

            this.reader.seek(quadOfs);
            this.readFace(quadCount, true, verts);

            this.reader.seek(save);
        }

    }

    readVertex(
        vertexCount: number
    ) {
        const VERTEX_MASK = 0b1111111111;
        const VERTEX_MSB = 0b1000000000;
        const VERTEX_LOW = 0b0111111111;
        const localIndices: Vector3[] = [];

        for (let i = 0; i < vertexCount; i++) {
            const dword = this.reader.readUInt32();
            const xBytes = (dword >> 0x00) & VERTEX_MASK;
            const yBytes = (dword >> 0x0a) & VERTEX_MASK;
            const zBytes = (dword >> 0x14) & VERTEX_MASK;

            const xHigh = (xBytes & VERTEX_MSB) * -1;
            const xLow = xBytes & VERTEX_LOW;

            const yHigh = (yBytes & VERTEX_MSB) * -1;
            const yLow = yBytes & VERTEX_LOW;

            const zHigh = (zBytes & VERTEX_MSB) * -1;
            const zLow = zBytes & VERTEX_LOW;

            const vec3 = new Vector3(
                (xHigh + xLow),
                (yHigh + yLow),
                (zHigh + zLow)
            );
            vec3.multiplyScalar(SCALE);
            vec3.applyMatrix4(ROT);

            localIndices.push(vec3);
        }

        return localIndices;
    }

    readFace(faceCount: number, isQuad: boolean, localIndices: Vector3[]) {
        const FACE_MASK = 0b1111111;
        const PIXEL_TO_FLOAT_RATIO = 0.00390625;
        const PIXEL_ADJUSTMEST = 0.001953125;

        for (let i = 0; i < faceCount; i++) {
            const au = this.reader.readUInt8();
            const av = this.reader.readUInt8();
            const bu = this.reader.readUInt8();
            const bv = this.reader.readUInt8();
            const cu = this.reader.readUInt8();
            const cv = this.reader.readUInt8();
            const du = this.reader.readUInt8();
            const dv = this.reader.readUInt8();

            const dword = this.reader.readUInt32();
            const materialIndex = (dword >> 28) & 0x3;

            const indexA = (dword >> 0x00) & FACE_MASK;
            const indexB = (dword >> 0x07) & FACE_MASK;
            const indexC = (dword >> 0x0e) & FACE_MASK;
            const indexD = (dword >> 0x15) & FACE_MASK;

            if (!localIndices[indexA]) {
                console.log(indexA);
                console.log(localIndices.length);
            }

            const a: FaceIndex = {
                materialIndex,
                boneIndex: -1,
                x: localIndices[indexA].x,
                y: localIndices[indexA].y,
                z: localIndices[indexA].z,
                u: au * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
                v: av * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
            };

            const b: FaceIndex = {
                materialIndex,
                boneIndex: -1,
                x: localIndices[indexB].x,
                y: localIndices[indexB].y,
                z: localIndices[indexB].z,
                u: bu * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
                v: bv * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
            };

            const c: FaceIndex = {
                materialIndex,
                boneIndex: -1,
                x: localIndices[indexC].x,
                y: localIndices[indexC].y,
                z: localIndices[indexC].z,
                u: cu * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
                v: cv * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
            };

            const d: FaceIndex = {
                materialIndex,
                boneIndex: -1,
                x: localIndices[indexD].x,
                y: localIndices[indexD].y,
                z: localIndices[indexD].z,
                u: du * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
                v: dv * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
            };

            this.faces.push(a, c, b);

            if (!isQuad) {
                continue;
            }

            this.faces.push(b, c, d);
        }
    }

    createBufferGeometry() {
        const geometry = new BufferGeometry();
        const pos: number[] = [];
        const uvs: number[] = [];

        this.faces.forEach((face, index) => {
            const { x, y, z, u, v, boneIndex, materialIndex } = face;
            pos.push(x, y, z);
            uvs.push(u, v);
        });

        geometry.setAttribute("position", new Float32BufferAttribute(pos, 3));
        geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
        geometry.computeVertexNormals();

        return geometry;
    }
}

export { Player };