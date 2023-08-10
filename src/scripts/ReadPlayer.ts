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

type DrawCall = {
    start: number;
    count: number;
    materialIndex: number;
};

const PLAYER_OFFSET = 0x110800
// const SCALE = 0.00125;
const SCALE = 0.0009;
const ROT = new Matrix4();
ROT.makeRotationX(Math.PI);


class Player {
    private reader: ByteReader;
    private faces: FaceIndex[] = [];
    private bones: Bone[] = []

    constructor(mem: ArrayBuffer) {
        const pbdData = mem.slice(PLAYER_OFFSET)
        this.reader = new ByteReader(pbdData);
    }

    parseMesh() {
        // Prepare Skeleton
        this.readBones();

        // Prepare Textures
        const a = new TextureLoader().load('/mx-0.png')
        a.flipY = false;
        a.needsUpdate = true;

        const b = new TextureLoader().load('/mx-1.png');
        b.flipY = false;
        b.needsUpdate = true;

        setTimeout(() => {
            a.needsUpdate = true;
            b.needsUpdate = true;
        }, 500)

        const mats = [new MeshBasicMaterial({ map: a }), new MeshBasicMaterial({ map: b })]
        this.readHead();
        this.readBody();
        this.readLeftArm();
        this.readSpecialWeapon();
        this.readFoot();

        const geometry = this.createBufferGeometry();
        const mesh = new SkinnedMesh(geometry, mats);
        const skeleton = new Skeleton(this.bones);

        const rootBone = skeleton.bones[0];
        mesh.add(rootBone);
        mesh.bind(skeleton);

        return mesh
    }

    readHead() {
        const HEAD_OFFSET = 0x111360
        const startOfs = HEAD_OFFSET - PLAYER_OFFSET;
        const submeshCount = 3;
        const boneIndex = 1;
        const matIndex = 1;

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
            const verts = this.readVertex(vertCount, boneIndex)
            this.reader.seek(triOfs);
            this.readFace(triCount, false, verts, boneIndex, matIndex);

            this.reader.seek(quadOfs);
            this.readFace(quadCount, true, verts, boneIndex, matIndex);

            this.reader.seek(save);
        }

    }

    readBody() {
        const BODY_OFFSET = 0x110880;
        const startOfs = BODY_OFFSET - PLAYER_OFFSET;
        const boneIndex = [0, 8, 9, 10, 12, 13];
        const matIndex = 0;

        this.reader.seek(startOfs);
        for (let i = 0; i < boneIndex.length; i++) {
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
            const verts = this.readVertex(vertCount, boneIndex[i])
            this.reader.seek(triOfs);
            this.readFace(triCount, false, verts, boneIndex[i], matIndex);

            this.reader.seek(quadOfs);
            this.readFace(quadCount, true, verts, boneIndex[i], matIndex);

            this.reader.seek(save);
        }

    }

    readLeftArm() {
        const ARM_OFFSET = 0x112a20;
        const startOfs = ARM_OFFSET - PLAYER_OFFSET;
        const boneIndex = [2, 3];
        const matIndex = 0;

        this.reader.seek(startOfs);
        for (let i = 0; i < boneIndex.length; i++) {
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
            const verts = this.readVertex(vertCount, boneIndex[i])
            this.reader.seek(triOfs);
            this.readFace(triCount, false, verts, boneIndex[i], matIndex);

            this.reader.seek(quadOfs);
            this.readFace(quadCount, true, verts, boneIndex[i], matIndex);

            this.reader.seek(save);
        }
    }

    readFoot() {
        const FOOT_OFFSET = 0x112000;
        const startOfs = FOOT_OFFSET - PLAYER_OFFSET;
        const boneIndex = [11, 14];
        const matIndex = 0;

        this.reader.seek(startOfs);
        for (let i = 0; i < boneIndex.length; i++) {
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
            const verts = this.readVertex(vertCount, boneIndex[i])
            this.reader.seek(triOfs);
            this.readFace(triCount, false, verts, boneIndex[i], matIndex);

            this.reader.seek(quadOfs);
            this.readFace(quadCount, true, verts, boneIndex[i], matIndex);

            this.reader.seek(save);
        }
    }

    readSpecialWeapon() {
        const ARM_OFFSET = 0x0113340;
        const startOfs = ARM_OFFSET - PLAYER_OFFSET;
        const boneIndex = [5, 6];
        const matIndex = [0, 1];

        this.reader.seek(startOfs);
        for (let i = 0; i < boneIndex.length; i++) {
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
            const verts = this.readVertex(vertCount, boneIndex[i])
            this.reader.seek(triOfs);
            this.readFace(triCount, false, verts, boneIndex[i], matIndex[i]);

            this.reader.seek(quadOfs);
            this.readFace(quadCount, true, verts, boneIndex[i], matIndex[i]);

            this.reader.seek(save);
        }
    }

    readVertex(
        vertexCount: number,
        boneIndex: number
    ) {
        const VERTEX_MASK = 0b1111111111;
        const VERTEX_MSB = 0b1000000000;
        const VERTEX_LOW = 0b0111111111;
        const localIndices: Vector3[] = [];
        const bone = this.bones[boneIndex]

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
            vec3.applyMatrix4(bone.matrixWorld);

            localIndices.push(vec3);
        }

        return localIndices;
    }

    readFace(faceCount: number, isQuad: boolean, localIndices: Vector3[], boneIndex: number, materialIndex: number) {
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
            // const materialIndex = (dword >> 28) & 0x3;

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
                boneIndex,
                x: localIndices[indexA].x,
                y: localIndices[indexA].y,
                z: localIndices[indexA].z,
                u: au * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
                v: av * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
            };

            const b: FaceIndex = {
                materialIndex,
                boneIndex,
                x: localIndices[indexB].x,
                y: localIndices[indexB].y,
                z: localIndices[indexB].z,
                u: bu * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
                v: bv * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
            };

            const c: FaceIndex = {
                materialIndex,
                boneIndex,
                x: localIndices[indexC].x,
                y: localIndices[indexC].y,
                z: localIndices[indexC].z,
                u: cu * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
                v: cv * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
            };

            const d: FaceIndex = {
                materialIndex,
                boneIndex,
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
        const skinIndices: number[] = [];
        const skinWeights: number[] = [];
        const drawCalls: DrawCall[] = [];

        this.faces.forEach((face, index) => {
            const { x, y, z, u, v, boneIndex, materialIndex } = face;
            console.log(materialIndex)
            pos.push(x, y, z);
            uvs.push(u, v);
            skinIndices.push(boneIndex, 0, 0, 0);
            skinWeights.push(1, 0, 0, 0);

            if (!drawCalls.length) {
                drawCalls.push({
                    start: 0,
                    count: 1,
                    materialIndex,
                });
            } else {
                const group = drawCalls[drawCalls.length - 1];
                if (group.materialIndex === materialIndex) {
                    group.count++;
                } else {
                    drawCalls.push({
                        start: index,
                        count: 1,
                        materialIndex,
                    });
                }
            }

        });

        console.log(drawCalls);

        geometry.setAttribute("position", new Float32BufferAttribute(pos, 3));
        geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
        geometry.setAttribute(
            "skinIndex",
            new Uint16BufferAttribute(skinIndices, 4)
        );
        geometry.setAttribute(
            "skinWeight",
            new Float32BufferAttribute(skinWeights, 4)
        );
        geometry.computeVertexNormals();
        drawCalls.forEach(({ start, count, materialIndex }) => {
            geometry.addGroup(start, count, materialIndex);
        });

        return geometry;
    }

    readBones() {

        const boneSrc = [{
            "pos": {
                "x": 0,
                "y": 0.90625,
                "z": -1.1098361617272889e-16
            },
            "name": "bone_000",
            "parent": -1
        },
        {
            "pos": {
                "x": 0,
                "y": 0.2575,
                "z": -3.153465507804434e-17
            },
            "name": "bone_001",
            "parent": 0
        },
        {
            "pos": {
                "x": -0.17500000000000002,
                "y": 0.1625,
                "z": -0.01250000000000002
            },
            "name": "bone_002",
            "parent": 0
        },
        {
            "pos": {
                "x": -0.025,
                "y": -0.2,
                "z": 2.4492935982947065e-17
            },
            "name": "bone_003",
            "parent": 2
        },
        {
            "pos": {
                "x": 0,
                "y": -0.1525,
                "z": 1.8675863686997135e-17
            },
            "name": "bone_004",
            "parent": 3
        },
        {
            "pos": {
                "x": 0.17500000000000002,
                "y": 0.1625,
                "z": -0.01250000000000002
            },
            "name": "bone_005",
            "parent": 0
        },
        {
            "pos": {
                "x": 0.025,
                "y": -0.2,
                "z": 2.4492935982947065e-17
            },
            "name": "bone_006",
            "parent": 5
        },
        {
            "pos": {
                "x": 0,
                "y": -0.1525,
                "z": 1.8675863686997135e-17
            },
            "name": "bone_007",
            "parent": 6
        },
        {
            "pos": {
                "x": 0,
                "y": 0,
                "z": 0
            },
            "name": "bone_008",
            "parent": 0
        },
        {
            "pos": {
                "x": -0.08125,
                "y": -0.09125,
                "z": 1.1174902042219598e-17
            },
            "name": "bone_009",
            "parent": 8
        },
        {
            "pos": {
                "x": 0,
                "y": -0.28125,
                "z": 3.444319122601931e-17
            },
            "name": "bone_010",
            "parent": 9
        },
        {
            "pos": {
                "x": 0,
                "y": -0.34875,
                "z": 4.2709557120263944e-17
            },
            "name": "bone_011",
            "parent": 10
        },
        {
            "pos": {
                "x": 0.08125,
                "y": -0.09125,
                "z": 1.1174902042219598e-17
            },
            "name": "bone_012",
            "parent": 8
        },
        {
            "pos": {
                "x": 0,
                "y": -0.28125,
                "z": 3.444319122601931e-17
            },
            "name": "bone_013",
            "parent": 12
        },
        {
            "pos": {
                "x": 0,
                "y": -0.34875,
                "z": 4.2709557120263944e-17
            },
            "name": "bone_014",
            "parent": 13
        }
        ];

        boneSrc.forEach(src => {

            const bone = new Bone();

            bone.position.x = src.pos.x;
            bone.position.y = src.pos.y;
            bone.position.z = src.pos.z;
            bone.name = src.name;

            if (this.bones[src.parent]) {
                this.bones[src.parent].add(bone);
            }

            this.bones.push(bone);

        });

        this.bones.forEach(bone => {
            bone.updateMatrix();
            bone.updateMatrixWorld();
        });


    }


}

export { Player };