import ByteReader from "bytereader";
import { onMount, createSignal } from "solid-js";

// We want to take a function that takes a .DAT file as an argument, reads the archive
// and then returns a list of images to be displayed on the page 

type DatHeader = {
  type: number;
  length: number;
}

type DatTexture = {
  pal: string[];
  img: number[];
}

const ACTUAL_COLOR_COUNT = 16;
const HEADER_BYTE_LENGTH = 12;

// const renderImage = (pal: string[], imageBody: number[]) => {

//   const canvas = createCanvas(width, height)
//   const context = canvas.getContext("2d")

//   

// }

const readPalette = (reader: ByteReader) => {

  console.log("Starting Palette: ", reader.tellf())

  // Subtract the length of the header to get the length of the image
  const length = reader.readUInt32() - HEADER_BYTE_LENGTH;
  const x = reader.readUInt16()
  const y = reader.readUInt16()
  const colorCount = reader.readUInt16()
  const fakePaletteCount = reader.readUInt16()
  const paletteCount = colorCount / ACTUAL_COLOR_COUNT;

  // Read all of the palette colors
  const palettes: string[][] = new Array();

  for (let i = 0; i < paletteCount; i++) {
    const colors: string[] = new Array()
    for (let k = 0; k < ACTUAL_COLOR_COUNT; k++) {
      const texel = reader.readUInt16()
      const r = ((texel >> 0x00) & 0x1f) << 3;
      const g = ((texel >> 0x05) & 0x1f) << 3;
      const b = ((texel >> 0x0a) & 0x1f) << 3;
      const a = texel > 0 ? 1 : 0;
      colors.push(`rgba(${r},${g},${b},${a})`);
    }
    palettes.push(colors)
  }

  return palettes[0];

}

const readImage = (reader: ByteReader) => {

  console.log("Starting Image: ", reader.tellf())

  const body: number[] = new Array()

  // Subtract the length of the header to get the length of the image
  const length = reader.readUInt32() - HEADER_BYTE_LENGTH
  const x = reader.readUInt16()
  const y = reader.readUInt16()
  const width = reader.readUInt16() * 4
  const height = reader.readUInt16()

  // console.log("Image Coord X: 0x", x.toString(16))
  // console.log("Image Coord Y: 0x", y.toString(16))

  for (let i = 0; i < length; i++) {
    const byte = reader.readUInt8()
    body.push((byte & 0xf));
    body.push((byte >> 4));
  }

  return body;
}

const readTextures = (buffer: ArrayBuffer) => {

  // The first thing that we want to do is read the header
  // If there is an image, we read an image/palette
  // If there is a palette, we retain the previous image
  // The first file in the archive should be an image

  const DUMMY = 0x6d6d7564
  const IMG_ENUM = 4
  const PAL_ENUM = 3
  const reader = new ByteReader(buffer);
  const header: DatHeader[] = [];

  while (reader.tell() < 0x800) {
    const type = reader.readUInt32()
    const length = reader.readUInt32()
    const _paramA = reader.readUInt32() // not used
    const _paramB = reader.readUInt32() // not used

    if (type === DUMMY) {
      break;
    }

    header.push({ type, length });
  }

  // It looks like there should be 2 images and 2-3 palettes
  // We should probably read everything as-is and return just the images for now

  const textures: DatTexture[] = [];

  reader.seek(0x800)
  header.forEach(({ type }) => {

    if (type === PAL_ENUM) {
      const pal = readPalette(reader);
      const img = textures[textures.length - 1].img;
      textures.push({
        pal, img
      })
    } else if (type === IMG_ENUM) {
      const pal = readPalette(reader);
      const img = readImage(reader);
      textures.push({
        pal, img
      })
    }
  })

  return textures;
}

const TexCard = ({ texture }: { texture: DatTexture }) => {

  return (
    <canvas ref={canvas => {
      const ctx = canvas.getContext("2d");
      const { pal, img } = texture;
      const width = 256;
      const height = 256;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const colorIndex = img[y * width + x]
          ctx!.fillStyle = pal[colorIndex]
          ctx!.fillRect(x, y, 1, 1)
        }
      }
    }} width={256} height={256} />
  )
}

const Textures = () => {

  const [getTextures, setTextures] = createSignal<DatTexture[]>([]);

  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug') || 'megaman';

    const textureLookup = [
      {
        slug: "megaman",
        url: "/dat/PL00T.DAT"
      },
      {
        slug: "roll",
        url: "/dat/PL01T.DAT"
      },
      {
        slug: "tron",
        url: "/dat/PL02T.DAT"
      },
      {
        slug: "apron",
        url: "/dat/PL03T.DAT"
      },
      {
        slug: "matilda",
        url: "/dat/PL04T.DAT"
      },
      {
        slug: "glide",
        url: "/dat/PL05T.DAT"
      },
      {
        slug: "geetz",
        url: "/dat/PL06T.DAT"
      }
    ]

    const { url } = textureLookup.find(lookup => lookup.slug === slug) || textureLookup[0];
    const req = await fetch(url);
    const buffer = await req.arrayBuffer();
    const tex = readTextures(buffer);
    setTextures(tex);
  })

  return (
    <section class="bg-white dark:bg-gray-900">
      <div class="max-w-screen-xl px-4 py-8 mx-auto lg:px-6 sm:py-16 lg:py-24">
        <div class="max-w-3xl mx-auto text-center">
          <h2
            class="text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl dark:text-white"
          >
            Textures
          </h2>
          <p
            class="my-4 text-base font-normal text-gray-500 dark:text-gray-400 sm:text-xl"
          >
            This is where we have some card that allows for people to see the textures of the character they want to inspect.
            Hopefully I don't do something stupid like reload it on every page load, but no promises.
          </p>
        </div>

        <div
          class="p-5 space-y-4 bg-white border border-gray-200 rounded-lg shadow-md lg:p-8 dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-white"
        >
          <p>
            Not sure if there's anything here in terms of debugging for the textures. 
            Posibilities would be palette swaps, coordinates, or adding the special weapon texture on the end.
            Or show 4 by default? But I'm not sure with what't going on with Glide.
          </p>
          <div class="grid grid-cols-1 gap-4 mt-8 xl:gap-12 md:grid-cols-4">
            {
              getTextures().map((tex) => (
                <TexCard texture={tex} />
              ))
            }
          </div>
        </div>

      </div>
    </section>
  )
}

export default Textures
