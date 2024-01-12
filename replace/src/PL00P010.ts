import { readFileSync, writeFileSync } from 'fs'

type Primitive = {
    tri: Buffer
    quad: Buffer
    vertices: Buffer
}

import {
    Vector3,
    Matrix4,
} from "three";

const LIGHTING_OFFSET = 0x2268;


// Megaman with No helmet, normal shoes

const PC_IN = `replace/PC_IN/PL00P010.DAT`
const PC_OUT = `replace/PC_OUT/PL00P010.DAT`
const PSX_IN = `replace/PSX_IN/PL00P010.BIN`
const PSX_OUT = `replace/PSX_OUT/PL00P010.BIN`

const writePSXFile = (body: Buffer) => {

    // Read the source
    const source = readFileSync(PSX_IN)

    // Get the section for the model
    const model = source.subarray(0x30, 0x2B70)

    // Remove ALL left arm buster data
    model.fill(0, 0x2220, 0x2268)
    model.fill(0x80, 0x2268, 0x26f0)

    const BODY_START = 0x0080;
    const HEAD_START = 0x0b60;
    const FEET_START = 0x1800;
    const LEFT_START = 0x1dd0;
    const BUSTER_START = 0x2220;
    const RIGHT_START = 0x26f0;
    const EOF = 0x02b40;

    // Replace the body
    model.fill(0, BODY_START, HEAD_START)
    for(let i = 0; i < body.length; i++){
        model[BODY_START + i] = body[i]
    }

    // Write the file
    writeFileSync(PSX_OUT, source)

}

const encodeVertex = (x: number, y: number, z: number) => {

    try {
        const xInt = encodeVertexBits(x)
        const yInt = encodeVertexBits(y)
        const zInt = encodeVertexBits(z)
        // Shift and merge vertex to make a 32 bit value
        const vertex = xInt | (yInt << 10) | (zInt << 20)
        return vertex
    } catch (err) {
        console.log("0 Scale invalid: ", x, y, z)
    }

    try {
        const xInt = encodeVertexBits(Math.floor(x / 2))
        const yInt = encodeVertexBits(Math.floor(y / 2))
        const zInt = encodeVertexBits(Math.floor(z / 2))
        // Shift and merge vertex to make a 32 bit value
        const vertex = xInt | (yInt << 10) | (zInt << 20) | (1 << 30)
        return vertex
    } catch (err) {
        console.log("1 Scale invalid: ", x, y, z)
        throw err;
    }


}

// Encode the Vertices
const encodeVertexBits = (num: number) => {

    if (num < 0) {
        const lowBits = 512 + num;
        const encodedVert = 0x200 | lowBits;
        if (encodedVert > 0x3ff) {
            return 0x3ff;
            throw new Error("Encoded vertex is too larged (neg)")
        }
        return encodedVert
    } else {
        if (num > 0x1ff) {
            return 0x1ff;
            throw new Error("Encoded vertex is too larged (pos)")
        }
        return num;
    }
}


const encodeMesh = (obj: string, faceMat: boolean = false): Primitive => {

    const SCALE = 1 / 0.00125;
    const ROT_X = new Matrix4();
    ROT_X.makeRotationX(Math.PI);

    // First step is to break the file down into primitives
    const lines = obj.split('\n');
    const verts: string[] = [];
    const uvs: string[] = [];
    const tris: string[] = [];
    const quads: string[] = []

    lines.forEach(line => {
        if (line.indexOf('v ') === 0) {
            verts.push(line)
        }

        if (line.indexOf('vt ') === 0) {
            uvs.push(line)
        }

        if (line.indexOf('f ') === 0) {
            const parts = line.split(' ')
            let edge = 0;
            parts.forEach(p => {
                edge += p.indexOf('/') !== -1 ? 1 : 0
            })
            switch (edge) {
                case 3:
                    tris.push(line)
                    break;
                case 4:
                    quads.push(line)
                    break;
                default:
                    throw new Error("Wait, what the fuck? " + line)
                    break;
            }

        }
    })

    const vertices = Buffer.alloc(verts.length * 4, 0)
    let vertOfs = 0;
    for (let i = 0; i < verts.length; i++) {
        // Extract string values for x,y,z
        const v = verts[i].split(' ');
        const xRaw = parseFloat(v[1])
        const yRaw = parseFloat(v[2])
        const zRaw = parseFloat(v[3])

        // // Scale and rotate to match psx orientation
        const vec3 = new Vector3(xRaw, yRaw, zRaw);
        vec3.multiplyScalar(SCALE);
        vec3.applyMatrix4(ROT_X);
        // vec3.applyMatrix4(ROT_Y);

        // // Round each value to nearest whole int
        vec3.x = Math.round(vec3.x)
        vec3.y = Math.round(vec3.y)
        vec3.z = Math.round(vec3.z)

        // // Encode x,y,z to signed 10 but values
        const { x, y, z } = vec3;

        // Shift and merge vertex to make a 32 bit value
        const vertex = encodeVertex(x, y, z)
        vertices.writeUInt32LE(vertex, vertOfs)
        vertOfs += 4
    }

    const PIXEL_TO_FLOAT_RATIO = 0.00390625;
    const PIXEL_ADJUSTMEST = 0.001953125;
    const pixels: [number, number][] = [];

    for (let i = 0; i < uvs.length; i++) {
        // Parse the information from the string
        const uv = uvs[i].split(' ');
        const uRaw = parseFloat(uv[1])
        // Flip V
        const vRaw = 1 - parseFloat(uv[2])

        // // Approximate the pixel
        const uAdjusted = (uRaw / PIXEL_TO_FLOAT_RATIO) + PIXEL_ADJUSTMEST
        const vAdjusted = (vRaw / PIXEL_TO_FLOAT_RATIO) + PIXEL_ADJUSTMEST

        // // Eniminate rounding to make sure it's a pixel reference
        const uFloor = Math.floor(uAdjusted)
        const vFloor = Math.floor(vAdjusted)

        // // Make sure it fits in one byte
        const u = uFloor > 255 ? 255 : uFloor < 0 ? 0 : uFloor;
        const v = vFloor > 255 ? 255 : vFloor < 0 ? 0 : vFloor;

        // Push the pixels to be referenced
        pixels.push([u, v])
    }

    // Encode the triangles for each of the faces
    const FACE_MASK = 0x7f;
    const tri = Buffer.alloc(tris.length * 12, 0);
    let triOfs = 0;
    for (let i = 0; i < tris.length; i++) {
        const f = tris[i].split(' ');

        const [aStr, aIdx] = f[2].split('/')
        const [bStr, bIdx] = f[1].split('/')
        const [cStr, cIdx] = f[3].split('/')

        // Obj Indices start at 1 not 0
        const a = parseInt(aStr) - 1
        const b = parseInt(bStr) - 1
        const c = parseInt(cStr) - 1

        // Same, Obj Indices start at 1 not 0
        const [au, av] = pixels[parseInt(aIdx) - 1];
        const [bu, bv] = pixels[parseInt(bIdx) - 1];
        const [cu, cv] = pixels[parseInt(cIdx) - 1];

        tri.writeUInt8(au, triOfs)
        triOfs++;
        tri.writeUInt8(av, triOfs)
        triOfs++;

        tri.writeUInt8(bu, triOfs)
        triOfs++;
        tri.writeUInt8(bv, triOfs)
        triOfs++;

        tri.writeUInt8(cu, triOfs)
        triOfs++;
        tri.writeUInt8(cv, triOfs)
        triOfs++;

        tri.writeUInt8(0, triOfs)
        triOfs++;
        tri.writeUInt8(0, triOfs)
        triOfs++;

        // Encode the face indices to a dword
        const indexA = a & FACE_MASK
        const indexB = b & FACE_MASK
        const indexC = c & FACE_MASK
        const indexD = 0

        const materialIndex = faceMat ? 2 : 0;

        // Material Index 0 = Img 0 - Palette 0
        // Material Index 1 = Img 0 - Palette 1

        const dword = indexA | (indexB << 7) | (indexC << 14) | (indexD << 21) | materialIndex << 28
        tri.writeUInt32LE(dword, triOfs)
        triOfs += 4
    }

    console.log(tri);

    const quad = Buffer.alloc(quads.length * 12, 0);
    let quadOfs = 0;
    for (let i = 0; i < quads.length; i++) {
        const f = quads[i].split(' ');

        const [aStr, aIdx] = f[1].split('/')
        const [bStr, bIdx] = f[4].split('/')
        const [cStr, cIdx] = f[2].split('/')
        const [dStr, dIdx] = f[3].split('/')

        // Obj Indices start at 1 not 0
        const a = parseInt(aStr) - 1
        const b = parseInt(bStr) - 1
        const c = parseInt(cStr) - 1
        const d = parseInt(dStr) - 1

        // Same, Obj Indices start at 1 not 0
        const [au, av] = pixels[parseInt(aIdx) - 1];
        const [bu, bv] = pixels[parseInt(bIdx) - 1];
        const [cu, cv] = pixels[parseInt(cIdx) - 1];
        const [du, dv] = pixels[parseInt(dIdx) - 1];

        quad.writeUInt8(au, quadOfs)
        quadOfs++;
        quad.writeUInt8(av, quadOfs)
        quadOfs++;

        quad.writeUInt8(bu, quadOfs)
        quadOfs++;
        quad.writeUInt8(bv, quadOfs)
        quadOfs++;

        quad.writeUInt8(cu, quadOfs)
        quadOfs++;
        quad.writeUInt8(cv, quadOfs)
        quadOfs++;

        quad.writeUInt8(du, quadOfs)
        quadOfs++;
        quad.writeUInt8(dv, quadOfs)
        quadOfs++;

        // Encode the face indices to a dword
        const indexA = a & FACE_MASK
        const indexB = b & FACE_MASK
        const indexC = c & FACE_MASK
        const indexD = d & FACE_MASK

        const materialIndex = 0;

        // Material Index 0 = Img 0 - Palette 0
        // Material Index 1 = Img 0 - Palette 1

        const dword = indexA | (indexB << 7) | (indexC << 14) | (indexD << 21) | materialIndex << 28
        quad.writeUInt32LE(dword, quadOfs)
        quadOfs += 4
    }

    return { tri, quad, vertices }
}

const encodeModelBody = (
    limbs: [string, string, string, string, string, string]
) => {

    const BODY_START = 0x80;
    const BODY_END = 0xe80
    const BODY_LEN = BODY_END - BODY_START;

    const prims: Primitive[] = []
    const START_OFS = 0x110;
    let shadowPtr = START_OFS
    for (let i = 0; i < limbs.length; i++) {
        const prim = encodeMesh(limbs[i]);
        const { tri, quad, vertices } = prim;
        prims.push(prim);
        shadowPtr += tri.length;
        shadowPtr += quad.length;
        shadowPtr += vertices.length;
    }


    const mesh = Buffer.alloc(BODY_LEN, 0x80);
    // Need to zero out the header
    for (let i = 0; i < START_OFS; i++) {
        mesh[i] = 0;
    }
    let headerOfs = 0;
    let contentOfs = START_OFS - BODY_START;
    prims.forEach(prim => {
        const { tri, quad, vertices } = prim;
        const triCount = tri.length / 12;
        const quadCount = quad.length / 12;
        const vertCount = vertices.length / 4;

        console.log("Vert Count: ", vertCount)

        // Write the header for each primitive
        mesh.writeUInt8(triCount, headerOfs + 0) // tris
        mesh.writeUInt8(quadCount, headerOfs + 1) // quads
        mesh.writeUInt8(vertCount, headerOfs + 2) // verts
        mesh.writeUInt8(0, headerOfs + 3) // nop
        headerOfs += 4;

        // Triangle Definition Offset
        mesh.writeUInt32LE(contentOfs + BODY_START, headerOfs)
        headerOfs += 4;
        for (let i = 0; i < tri.length; i++) {
            mesh[contentOfs++] = tri[i]
        }

        // Quad Definition Offset
        mesh.writeUInt32LE(contentOfs + BODY_START, headerOfs)
        headerOfs += 4;
        for (let i = 0; i < quad.length; i++) {
            mesh[contentOfs++] = quad[i]
        }

        // Vertex Definition Offset
        mesh.writeUInt32LE(contentOfs + BODY_START, headerOfs)
        headerOfs += 4;
        for (let i = 0; i < vertices.length; i++) {
            mesh[contentOfs++] = vertices[i]
        }

        // Triangle Shadow Offset
        mesh.writeUInt32LE(shadowPtr, headerOfs)
        headerOfs += 4;

        // Quad Shadow Offset
        mesh.writeUInt32LE(shadowPtr, headerOfs)
        headerOfs += 4;
    })

    console.log("End Offset: 0x%s", contentOfs.toString(16))
    console.log("Length: 0x%s", BODY_LEN.toString(16))

    return mesh;
}

const PL00P010 = (
    body: [string, string, string, string, string, string]
) => {

    // On the first pass, we want to read the MegaMan model
    // and then comment out the arm to confirm the limbs
    // and then we can update the pointers to see what room we can get

    

    const a = encodeModelBody(body);

    writePSXFile(a);
}

export default PL00P010;
export { PL00P010 }