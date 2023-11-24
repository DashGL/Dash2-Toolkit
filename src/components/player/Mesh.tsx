import ByteReader from "bytereader";
import { onMount, createSignal } from "solid-js";
import { OrbitControls } from "@three-ts/orbit-controls";
import { saveAs } from "file-saver";
import {
  BufferGeometry,
  BoxGeometry,
  MeshBasicMaterial,
  Color,
  Float32BufferAttribute,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Matrix4,
  Mesh,
  MeshNormalMaterial,
  Vector3,
  GridHelper
} from "three";

// Define Types

type MeshHeader = {
  triCount: number;
  quadCount: number;
  vertCount: number;
  triOfs: number;
  quadOfs: number;
  vertOfs: number;
  triColorOfs: number;
  quadColorOfs: number;
}

type FaceIndex = {
  materialIndex: number;
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

// Define Constants

const BODY_COUNT = 6;
const HEAD_COUNT = 3;
const FEET_COUNT = 2;
const RIGHT_COUNT = 3;
const LEFT_COUNT = 3;

const SCALE = 0.0009;
const ROT = new Matrix4();
ROT.makeRotationX(Math.PI);

const meshLookup = [
  {
    slug: "megaman",
    url: "/dat/PL00P010.DAT",
    bodyOfs: 0x80,
    headOfs: 0xb60,
    feetOfs: 0x1800,
    leftOfs: 0x1dd0,
    rightOfs: 0x26f0,
  },
  {
    slug: "roll",
    url: "/dat/PL01P000.DAT",
    bodyOfs: 0x80,
    headOfs: 0xe80,
    feetOfs: 0x1a80,
    leftOfs: 0x1f00,
    rightOfs: 0x2c00,
  },
  {
    slug: "tron",
    url: "/dat/PL02P000.DAT",
    bodyOfs: 0x80,
    headOfs: 0xe80,
    feetOfs: 0x1a80,
    leftOfs: 0x1f00,
    rightOfs: 0x2c00,
  },
  {
    slug: "apron",
    url: "/dat/PL03P000.DAT",
    bodyOfs: 0x80, // fits
    headOfs: 0xe80,
    feetOfs: 0x1a80,
    leftOfs: 0x1f00,
    rightOfs: 0x2c00,
  },
  {
    slug: "matilda",
    url: "/dat/PL04P000.DAT",
    bodyOfs: 0x80, //fits
    headOfs: 0xe80,
    feetOfs: 0x1a80,
    leftOfs: 0x1f00,
    rightOfs: 0x2c00,
  },
  {
    slug: "glide",
    url: "/dat/PL05P000.DAT",
    bodyOfs: 0x80,
    headOfs: 0xe80,
    feetOfs: 0x1a80,
    leftOfs: 0x1f00,
    rightOfs: 0x2c00,
  },
  {
    slug: "geetz",
    url: "/dat/PL06P000.DAT",
    bodyOfs: 0x80, // fits
    headOfs: 0xe80,
    feetOfs: 0x1a80,
    leftOfs: 0x1f00,
    rightOfs: 0x2c00,
  }
]

const createGeometry = (tris: FaceIndex[], quads: FaceIndex[], triColor: Color[], quadColor: Color[]) => {

  const faces = tris.concat(quads);
  const colots = triColor.concat(quadColor);

  const geometry = new BufferGeometry();
  const pos: number[] = [];
  const uvs: number[] = [];
  const drawCalls: DrawCall[] = [];

  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];
    const { x, y, z, u, v, materialIndex } = face;
    pos.push(x, y, z);
    uvs.push(u, v);

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
          start: i,
          count: 1,
          materialIndex,
        });
      }
    }
  }

  geometry.setAttribute("position", new Float32BufferAttribute(pos, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));

  geometry.computeVertexNormals();
  drawCalls.forEach(({ start, count, materialIndex }) => {
    geometry.addGroup(start, count, materialIndex);
  });

  return geometry;
}

const readVertex = (reader: ByteReader, ofs: number, count: number) => {
  reader.seek(ofs)
  const VERTEX_MASK = 0b1111111111;
  const VERTEX_MSB = 0b1000000000;
  const VERTEX_LOW = 0b0111111111;
  const localIndices: Vector3[] = [];

  for (let i = 0; i < count; i++) {
    const dword = reader.readUInt32();
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

const readColors = (reader: ByteReader, ofs: number, count: number, isQuad: boolean) => {

  const faces: Color[] = []

  reader.seek(ofs);
  for (let i = 0; i < count; i++) {
    // Read the face values
    const aColor = reader.readUInt8();
    const bColor = reader.readUInt8();
    const cColor = reader.readUInt8();
    const dColor = reader.readUInt8();

    // Set each value as a number between 0 and 1
    // The game is able to over-saturate to go from black to white
    // in our case white is just the color, so we only get the shading
    const aVal = aColor / 0x80 > 1 ? 1 : aColor / 0x80;
    const bVal = bColor / 0x80 > 1 ? 1 : bColor / 0x80;
    const cVal = cColor / 0x80 > 1 ? 1 : cColor / 0x80;
    const dVal = dColor / 0x80 > 1 ? 1 : dColor / 0x80;

    // Then we create a color for each index
    // Each of these will be a gray-scale value where the same value
    // is applied for red, green and blue
    const a = new Color(aVal, aVal, aVal);
    const b = new Color(bVal, bVal, bVal);
    const c = new Color(cVal, cVal, cVal);
    const d = new Color(dVal, dVal, dVal);

    // Then we add them to the face list in the same order we
    // draw the triangles, this could be completely wrong
    // but when had that stopped me?
    faces.push(a, c, b);
    if (!isQuad) {
      continue;
    }
    faces.push(b, c, d);
  }

  return faces;

}

const readFace = (reader: ByteReader, verts: Vector3[], ofs: number, count: number, isQuad: boolean) => {
  const faces: FaceIndex[] = [];
  const FACE_MASK = 0b1111111;
  const PIXEL_TO_FLOAT_RATIO = 0.00390625;
  const PIXEL_ADJUSTMEST = 0.001953125;

  reader.seek(ofs);
  for (let i = 0; i < count; i++) {
    const au = reader.readUInt8() * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST;
    const av = reader.readUInt8() * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST;
    const bu = reader.readUInt8() * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST;
    const bv = reader.readUInt8() * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST;
    const cu = reader.readUInt8() * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST;
    const cv = reader.readUInt8() * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST;
    const du = reader.readUInt8() * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST;
    const dv = reader.readUInt8() * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST;

    const dword = reader.readUInt32();
    const materialIndex = (dword >> 28) & 0x3;

    const indexA = (dword >> 0x00) & FACE_MASK;
    const indexB = (dword >> 0x07) & FACE_MASK;
    const indexC = (dword >> 0x0e) & FACE_MASK;
    const indexD = (dword >> 0x15) & FACE_MASK;


    const a: FaceIndex = {
      materialIndex,
      x: verts[indexA].x,
      y: verts[indexA].y,
      z: verts[indexA].z,
      u: au,
      v: av,
    };

    const b: FaceIndex = {
      materialIndex,
      x: verts[indexB].x,
      y: verts[indexB].y,
      z: verts[indexB].z,
      u: bu * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
      v: bv * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
    };

    const c: FaceIndex = {
      materialIndex,
      x: verts[indexC].x,
      y: verts[indexC].y,
      z: verts[indexC].z,
      u: cu * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
      v: cv * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
    };

    const d: FaceIndex = {
      materialIndex,
      x: verts[indexD].x,
      y: verts[indexD].y,
      z: verts[indexD].z,
      u: du * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
      v: dv * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
    };

    faces.push(a, c, b);
    if (!isQuad) {
      continue;
    }
    faces.push(b, c, d);
  }

  return faces;
}


const parseMesh = (reader: ByteReader, ofs: number, count: number) => {

  const meshList: Mesh[] = [];
  const headers: MeshHeader[] = [];
  reader.seek(ofs);

  const mat = new MeshNormalMaterial();

  for (let i = 0; i < count; i++) {
    // Read counts
    const triCount = reader.readUInt8();
    const quadCount = reader.readUInt8();
    const vertCount = reader.readUInt8();
    // Fourth byte is not used
    const _nop = reader.readUInt8();
    // Read Offsets to definitions
    const triOfs = reader.readUInt32();
    const quadOfs = reader.readUInt32();
    const vertOfs = reader.readUInt32();
    const triColorOfs = reader.readUInt32();
    const quadColorOfs = reader.readUInt32();
    // Create a header entry
    headers.push({
      triCount,
      quadCount,
      vertCount,
      triOfs,
      quadOfs,
      vertOfs,
      triColorOfs,
      quadColorOfs
    })
  }

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const { vertCount, vertOfs, triCount, triOfs, quadCount, quadOfs } = header;
    const verts = readVertex(reader, vertOfs, vertCount)
    const tris = readFace(reader, verts, triOfs, triCount, false)
    const quads = readFace(reader, verts, quadOfs, quadCount, true)
    const { triColorOfs, quadColorOfs } = header;
    const triColor = readColors(reader, triColorOfs, triCount, false);
    const quadColor = readColors(reader, quadColorOfs, quadCount, false);

    const geometry = createGeometry(tris, quads, triColor, quadColor);
    const mesh = new Mesh(geometry, mat);
    meshList.push(mesh);
  }

  return meshList;
}

const Canvas = ({ mesh }: { mesh: Mesh }) => {

  const grid = new GridHelper(100, 10);
  const width = 300;
  const height = 300;

  return (
    <canvas class="border" ref={canvas => {
      const scene = new Scene();
      const camera = new PerspectiveCamera(50, width / height, 0.1, 1000);
      const renderer = new WebGLRenderer({ canvas, alpha: true });
      renderer.setClearColor(new Color(0), 0);
      scene.add(mesh);
      // scene.add(grid);
      new OrbitControls(camera, canvas);

      camera.position.z = 1;
      camera.position.y = 0.1;
      camera.position.x = 0;

      function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      }

      animate();

    }} width={width} height={height} />
  )
}

const Meshes = () => {

  const [getBody, setBody] = createSignal<Mesh[]>([]);
  const [getHead, setHead] = createSignal<Mesh[]>([]);
  const [getFeet, setFeet] = createSignal<Mesh[]>([]);
  const [getLeft, setLeft] = createSignal<Mesh[]>([]);
  const [getRight, setRight] = createSignal<Mesh[]>([]);

  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug') || 'megaman';

    const params = meshLookup.find(lookup => lookup.slug === slug) || meshLookup[0];
    const { url } = params
    const req = await fetch(url);
    const buffer = await req.arrayBuffer();

    // Get the first file from the loaded archive
    const archive = new ByteReader(buffer);
    archive.seek(4);
    const length = archive.readUInt32();

    // Returns and array buffer, this is going to be the mesh
    // We may need to download this to trace the offsets,
    // but it makes more sense to do that with a node based script
    const file = archive.subArray(0x800, 0x800 + length);

    // Comment Out Auto-Download
    // const mime = { type: "application/octet-stream" };
    // const blob = new Blob([file], mime);
    // saveAs(blob, `${slug}.bin`);

    // Create a new file reader for the mesh body
    const reader = new ByteReader(file);

    // Then we parse each of the individual meshes from each section of the mesh
    const { bodyOfs, headOfs, feetOfs, rightOfs, leftOfs } = params
    const body = parseMesh(reader, bodyOfs, BODY_COUNT);
    setBody(body);
    const head = parseMesh(reader, headOfs, HEAD_COUNT);
    setHead(head)
    const feet = parseMesh(reader, feetOfs, FEET_COUNT);
    setFeet(feet)
    const left = parseMesh(reader, leftOfs, LEFT_COUNT);
    setLeft(left)
    const right = parseMesh(reader, rightOfs, RIGHT_COUNT);
    setRight(right)

  })

  return (
    <section class="bg-white dark:bg-gray-900">
      <div class="max-w-screen-xl px-4 py-8 mx-auto lg:px-6 sm:py-16 lg:py-24">
        <div class="max-w-3xl mx-auto text-center">
          <h2
            class="text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl dark:text-white"
          >
            Meshes
          </h2>
          <p
            class="my-4 text-base font-normal text-gray-500 dark:text-gray-400 sm:text-xl"
          >
            Meshes will be similar to textures. We want to figure out which character is selected and then
            load the file that's associated with it. Being able to display the mesh with textures will
            depend on state from the texture component, but I can start with displaying flat colors
            and then add in the textures by using a parent component or something
          </p>
        </div>

        <div
          class="p-5 space-y-4 bg-white border border-gray-200 rounded-lg shadow-md lg:p-8 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white"
        >
          <h3 class="text-2xl font-extrabold leading-tight tracking-tight text-center text-gray-900 dark:text-white">Body</h3>
          <p>
            We could add something here about the <b>expected</b> start and stop location for each one of the meshes, number of verts, tris, and quads.
          </p>
          <div class="grid grid-cols-1 gap-4 mt-8 xl:gap-12 md:grid-cols-3">

            {
              getBody().map((mesh) => (
                <Canvas mesh={mesh} />
              ))
            }
          </div>
        </div>

        <div
          class="mt-3 p-5 space-y-4 bg-white border border-gray-200 rounded-lg shadow-md lg:p-8 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white"
        >
          <h3 class="text-2xl font-extrabold leading-tight tracking-tight text-center text-gray-900 dark:text-white">Head</h3>
          <p>
            Similar story for head. Maybe it would be a good idea to break this our into its own component?
          </p>
          <div class="grid grid-cols-1 gap-4 mt-8 xl:gap-12 md:grid-cols-3">

            {
              getHead().map((mesh) => (
                <Canvas mesh={mesh} />
              ))
            }
          </div>
        </div>

        <div
          class="mt-3 p-5 space-y-4 bg-white border border-gray-200 rounded-lg shadow-md lg:p-8 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white"
        >
          <h3 class="text-2xl font-extrabold leading-tight tracking-tight text-center text-gray-900 dark:text-white">Feet</h3>
          <p>
            Now it really makes sense to do a component. I guess we should add in a check to see if it fits within the expected range for Megaman. Also I should probably add 
            labels for each limp.
          </p>
          <div class="grid grid-cols-1 gap-4 mt-8 xl:gap-12 md:grid-cols-3">
            {
              getFeet().map((mesh) => (
                <Canvas mesh={mesh} />
              ))
            }
          </div>
        </div>

        <div
          class="mt-3 p-5 space-y-4 bg-white border border-gray-200 rounded-lg shadow-md lg:p-8 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white"
        >
          <h3 class="text-2xl font-extrabold leading-tight tracking-tight text-center text-gray-900 dark:text-white">Left Arm</h3>
          <p>
            Left arm when out of battle. Left arm with buster is a duplicate of this data, so we may need to either copy it, or maybe point to it as a way to save space to
            be able to pack in more data. That seems kind of too fancy for me right now. 
          </p>
          <div class="grid grid-cols-1 gap-4 mt-8 xl:gap-12 md:grid-cols-3">
            {
              getLeft().map((mesh) => (
                <Canvas mesh={mesh} />
              ))
            }
          </div>
        </div>

        <div
          class="mt-3 p-5 space-y-4 bg-white border border-gray-200 rounded-lg shadow-md lg:p-8 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white"
        >
          <h3 class="text-2xl font-extrabold leading-tight tracking-tight text-center text-gray-900 dark:text-white">Right Arm</h3>
          <p>
            The right arm. This is always in memory and I think the hand gets replaced by the special weapon if one is equipped. Also this completely broke a lot of stuff
            when I tried to replace it in memory.
          </p>
          <div class="grid grid-cols-1 gap-4 mt-8 xl:gap-12 md:grid-cols-3">
            {
              getRight().map((mesh) => (
                <Canvas mesh={mesh} />
              ))
            }
          </div>
        </div>

      </div>
    </section>
  )
}

export default Meshes
