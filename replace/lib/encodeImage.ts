import { PNG } from 'pngjs';

const encodeTexel = (r: number, g: number, b: number, a: number) => {
    const rClr = (r >> 3) & 0x1f;
    const gClr = ((g >> 3) & 0x1f) << 5
    const bClr = ((b >> 3) & 0x1f) << 10
    const aClr = a === 0 ? 0 : 0x8000
    const texel = rClr | gClr | bClr | aClr;
    return texel;
}

// Function expects a png buffer for the image
const encodeImage = (pngSrc: Buffer) => {

    const pngInfo = PNG.sync.read(pngSrc);
    const { width, height, data } = pngInfo;

    if (width !== 256 || height !== 256) {
        throw new Error("Encoder expects a 256x256 image");
    }

    let inOfs = 0;
    let outOfs = 0;
    const palette: number[] = [0]
    const pal = Buffer.alloc(0x20, 0)
    const img = Buffer.alloc(0x8000, 0)

    const readPixel = () => {
        const a = data.readUInt8(inOfs + 3) === 0 ? 0 : 255;
        const r = a === 0 ? 0 : data.readUInt8(inOfs + 0)
        const g = a === 0 ? 0 : data.readUInt8(inOfs + 1)
        const b = a === 0 ? 0 : data.readUInt8(inOfs + 2)
        const texel = encodeTexel(r, g, b, a);
        inOfs += 4

        // Search through the existing palette
        const index = palette.indexOf(texel);

        // If doesn't exist, we add it to the palette
        if (index === -1) {
            const pos = palette.length;
            palette.push(texel)
            return pos;
        }

        return index;
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x += 2) {
            const lowByte = readPixel()
            const highByte = readPixel()
            const byte = ((highByte << 4) | lowByte) & 0xff
            img[outOfs] = byte;
            outOfs++;
        }
    }

    outOfs = 0
    for (let i = 0; i < 16; i++) {
        const texel = palette[i] || 0x0000;
        pal.writeUInt16LE(texel, outOfs)
        outOfs += 2
    }

    return { pal, img }
}

export default encodeImage
export { encodeImage }