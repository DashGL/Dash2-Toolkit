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




// Megaman with No helmet, normal shoes

const PC_IN = `replace/PC_IN/PL00P010.DAT`
const PC_OUT = `replace/PC_OUT/PL00P010.DAT`
const PSX_IN = `replace/PSX_IN/PL00P010.BIN`
const PSX_OUT = `replace/PSX_OUT/PL00P010.BIN`

const writePSXFile = (model: Buffer) => {

    // Read the source
    const source = readFileSync(PSX_IN)

    // Get the section for the model
    for (let i = 0x80; i < model.length; i++) {
        source[i + 0x30] = model[i]
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


const PL00P010 = (
    body: [string, string, string, string, string, string],
    head: [string],
    feet: [string, string],
    left: [string, string, string],
    right: [string, string, string],
) => {

    const BODY_START = 0x0080;
    const BODY_CONTENT = 0x0110;

    const HEAD_START = 0x0b60;
    const HEAD_CONTENT = 0x0ba8;

    const FEET_START = 0x1800;
    const FEET_CONTENT = 0x01830;

    const LEFT_START = 0x1dd0;
    const LEFT_CONTENT = 0x1e18;

    const BUSTER_START = 0x2220;

    const RIGHT_START = 0x26f0;
    const RIGHT_CONTENT = 0x2738;

    const EOF = 0x02b40;

    const bodyMesh: Primitive[] = [
        encodeMesh(body[0]),
        encodeMesh(body[1]),
        encodeMesh(body[2]),
        encodeMesh(body[3]),
        encodeMesh(body[4]),
        encodeMesh(body[5]),
    ]

    const headMesh: Primitive[] = [
        encodeMesh(head[0]),
        {
            vertices: Buffer.from('5f2cde3ba12fde3bb06faf3b00402f39b5a32f3b4ba02f3b007c1f380598bf38fb9bbf38001cfe38a6cfce3b5accce3b506caf3b', 'hex'),
            tri: Buffer.from('01101f1b051f00008a8100e03a2b3d363a360000838301a0072f002f03260000078401a03336382b39360000888101a0201b3f103b1f0000830503e0', 'hex'),
            quad: Buffer.from('2222201b3a223b1f874181e11e2206221f1b051f08c240e01f1b01101f000002034522a0201b20003f103f0283c402a0', 'hex'),
        },
        {
            vertices: Buffer.from('0060003bb5a32f3b4ba02f3b2d14103bd317103b00ec4f390598bf38fb9bbf38', 'hex'),
            tri: Buffer.from('202b2f2e20360000850100a0102e1f2b1f360000840200a022231f2b1d23000086c201a0', 'hex'),
            quad: Buffer.from('06231d23102e1f2b8103a1a03a232f2e2223202b8281a1a0', 'hex'),
        }
    ]

    const feetMesh: Primitive[] = [
        encodeMesh(feet[0]),
        encodeMesh(feet[1]),
    ]

    const leftMesh: Primitive[] = [
        encodeMesh(left[0]),
        encodeMesh(left[1]),
        encodeMesh(left[2]),
    ]

    const rightMesh: Primitive[] = [
        encodeMesh(right[0]),
        encodeMesh(right[1]),
        encodeMesh(right[2]),
    ]

    const model = Buffer.alloc(EOF, 0);
    const LIGHTING_OFFSET = 0x2268;

    const content = [
        { start: BODY_CONTENT, end: HEAD_START },
        { start: HEAD_CONTENT, end: FEET_START },
        { start: FEET_CONTENT, end: LEFT_START },
        { start: LEFT_CONTENT, end: BUSTER_START },
        { start: RIGHT_CONTENT, end: EOF },
    ]

    const writeSegment = (vertices: Buffer, tri: Buffer, quad: Buffer, ofs: number) => {
        const triCount = tri.length / 12;
        const quadCount = quad.length / 12;
        const vertCount = vertices.length / 4;

        model.writeUInt8(triCount, ofs + 0) // tris
        model.writeUInt8(quadCount, ofs + 1) // quads
        model.writeUInt8(vertCount, ofs + 2) // verts
        model.writeUInt8(0, ofs + 3) // nop

        // Triangle Definition Offset
        let found = false;
        for (let i = 0; i < 3; i++) {
            const { start, end } = content[i];
            const len = end - start;
            const src = tri;
            if (src.length > len) {
                continue;
            }

            model.writeUInt32LE(start, ofs + 0x04)
            for (let n = 0; n < src.length; n++) {
                model[start + n] = src[n]
            }
            content[i].start += src.length
            found = true;
            break;
        }

        if (!found) {
            throw new Error("No space for triangles")
        }


        // Quad Definition Offset
        found = false;
        for (let i = 0; i < 3; i++) {
            const { start, end } = content[i];
            const len = end - start;
            const src = quad;
            if (src.length > len) {
                continue;
            }

            model.writeUInt32LE(start, ofs + 0x08)
            for (let n = 0; n < src.length; n++) {
                model[start + n] = src[n]
            }
            content[i].start += src.length
            found = true;
            break;
        }

        if (!found) {
            throw new Error("No space for quads")
        }

        // Vertex Definition Offset
        found = false;
        for (let i = 0; i < 3; i++) {
            const { start, end } = content[i];
            const len = end - start;
            const src = vertices;
            if (src.length > len) {
                continue;
            }

            model.writeUInt32LE(start, ofs + 0x0c)
            for (let n = 0; n < src.length; n++) {
                model[start + n] = src[n]
            }
            content[i].start += src.length
            found = true;
            break;
        }

        // Triangle Shadow Offset
        model.writeUInt32LE(LIGHTING_OFFSET, ofs + 0x10)

        // Quad Shadow Offset
        model.writeUInt32LE(LIGHTING_OFFSET, ofs + 0x14)

        ofs += 0x18;
    }

    bodyMesh.forEach((prim, index) => {
        const { vertices, tri, quad } = prim;
        writeSegment(vertices, tri, quad, BODY_START + (index * 0x18))
    })

    headMesh.forEach((prim, index) => {
        const { vertices, tri, quad } = prim;
        writeSegment(vertices, tri, quad, HEAD_START + (index * 0x18))
    })

    feetMesh.forEach((prim, index) => {
        const { vertices, tri, quad } = prim;
        writeSegment(vertices, tri, quad, FEET_START + (index * 0x18))
    })

    leftMesh.forEach((prim, index) => {
        const { vertices, tri, quad } = prim;
        writeSegment(vertices, tri, quad, LEFT_START + (index * 0x18))
    })

    rightMesh.forEach((prim, index) => {
        const { vertices, tri, quad } = prim;
        writeSegment(vertices, tri, quad, RIGHT_START + (index * 0x18))
    })

    // Remove ALL left arm buster data
    model.fill(0, BUSTER_START, 0x2268)
    model.fill(0x80, 0x2268, 0x26f0)

    // Write the encoded mesh to the file
    writePSXFile(model);
}

export default PL00P010;
export { PL00P010 }