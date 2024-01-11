import { readFileSync, writeFileSync } from 'fs'
import { compressImage } from '../lib/compressImage'
import { encodeImage } from '../lib/encodeImage'

/*

In this file, we replace the default MegaMan body and face textures
and replace them in their respective PSX and PC files

*/

const PC_FILE = `replace/PC_IN/PL00T.DAT`
const PSX_IN = `replace/PSX_IN/PL00T.BIN`
const PSX_OUT = `replace/PSX_OUT/PL00T.BIN`


const writePCFile = (bodyPal:Buffer, bodyImg:Buffer, facePal:Buffer, faceImg:Buffer) => {

    const source = readFileSync(PC_FILE);

    writeFileSync(PC_FILE, source)
}

const writePSXFile = (bodyPal:Buffer, bodyImg:Buffer, facePal:Buffer, faceImg:Buffer) => {

    const source = readFileSync(PSX_IN);
    const STRIDE = 0x800

    // Get the header for image 0
    const img0Header = {
        type: source.readUInt32LE(0x00),
        fullSize: source.readUInt32LE(0x04),
        paletteX: source.readUInt16LE(0x0c),
        paletteY: source.readUInt16LE(0x0e),
        colorCount: source.readUInt16LE(0x10),
        paletteCount: source.readUInt16LE(0x12),
        imageX: source.readUInt16LE(0x14),
        imageY: source.readUInt16LE(0x16),
        width: source.readUInt16LE(0x18),
        height: source.readUInt16LE(0x1a),
        bitfieldSize: source.readUInt16LE(0x24),
        bool: source.readUInt16LE(0x26),
    }

    // Copy the secondary palette
    const pal = Buffer.from(source.subarray(0x3000, 0x30b0))

    // Get the header for image 1
    const img1Header = {
        type: source.readUInt32LE(0x3800 + 0x00),
        fullSize: source.readUInt32LE(0x3800 + 0x04),
        paletteX: source.readUInt16LE(0x3800 + 0x0c),
        paletteY: source.readUInt16LE(0x3800 + 0x0e),
        colorCount: source.readUInt16LE(0x3800 + 0x10),
        paletteCount: source.readUInt16LE(0x3800 + 0x12),
        imageX: source.readUInt16LE(0x3800 + 0x14),
        imageY: source.readUInt16LE(0x3800 + 0x16),
        width: source.readUInt16LE(0x3800 + 0x18),
        height: source.readUInt16LE(0x3800 + 0x1a),
        bitfieldSize: source.readUInt16LE(0x3800 + 0x24),
        bool: source.readUInt16LE(0x3800 + 0x26),
    }

    // Compress the body image to replace in archive
    const bodyTexture = Buffer.concat([bodyPal, bodyImg])
    const [bodyBits, bodyPayload] = compressImage(bodyTexture)
    img0Header.colorCount = 16;
    img0Header.fullSize = bodyTexture.length;
    img0Header.bitfieldSize = bodyBits.length;

    const bodyHeader = Buffer.alloc(0x30, 0);
    bodyHeader.writeUInt32LE(img0Header.type, 0x00)
    bodyHeader.writeUInt32LE(img0Header.fullSize, 0x04)
    bodyHeader.writeUInt16LE(img0Header.paletteX, 0x0c)
    bodyHeader.writeUInt16LE(img0Header.paletteY, 0x0e)
    bodyHeader.writeUInt16LE(img0Header.colorCount, 0x10)
    bodyHeader.writeUInt16LE(img0Header.paletteCount, 0x12)
    bodyHeader.writeUInt16LE(img0Header.imageX, 0x14)
    bodyHeader.writeUInt16LE(img0Header.imageY, 0x16)
    bodyHeader.writeUInt16LE(img0Header.width, 0x18)
    bodyHeader.writeUInt16LE(img0Header.height, 0x1a)
    bodyHeader.writeUInt16LE(img0Header.bitfieldSize, 0x24)
    bodyHeader.writeUInt16LE(img0Header.bool, 0x26)
    const encodedBody = Buffer.concat([bodyHeader, bodyBits, bodyPayload])

    // Compress the Face image to replace in archive
    const faceTexture = Buffer.concat([facePal, faceImg])
    const [faceBits, facePayload] = compressImage(faceTexture)
    img1Header.colorCount = 16;
    img1Header.fullSize = faceTexture.length;
    img1Header.bitfieldSize = faceBits.length;

    const faceHeader = Buffer.alloc(0x30, 0);
    faceHeader.writeUInt32LE(img1Header.type, 0x00)
    faceHeader.writeUInt32LE(img1Header.fullSize, 0x04)
    faceHeader.writeUInt16LE(img1Header.paletteX, 0x0c)
    faceHeader.writeUInt16LE(img1Header.paletteY, 0x0e)
    faceHeader.writeUInt16LE(img1Header.colorCount, 0x10)
    faceHeader.writeUInt16LE(img1Header.paletteCount, 0x12)
    faceHeader.writeUInt16LE(img1Header.imageX, 0x14)
    faceHeader.writeUInt16LE(img1Header.imageY, 0x16)
    faceHeader.writeUInt16LE(img1Header.width, 0x18)
    faceHeader.writeUInt16LE(img1Header.height, 0x1a)
    faceHeader.writeUInt16LE(img1Header.bitfieldSize, 0x24)
    faceHeader.writeUInt16LE(img1Header.bool, 0x26)
    const encodedFace = Buffer.concat([faceHeader, faceBits, facePayload])

    // Reset the PSX archive so we can write our own
    source.fill(0)
    
    // Write the Content to the file

    let ofs = 0;
    for(let i = 0; i < encodedBody.length; i++) {
        source[ofs++] = encodedBody[i]
    }
    ofs = Math.ceil(ofs / STRIDE) * STRIDE;

    for(let i = 0; i < pal.length; i++) {
        source[ofs++] = pal[i]
    }
    ofs = Math.ceil(ofs / STRIDE) * STRIDE;

    for(let i = 0; i < encodedFace.length; i++) {
        source[ofs++] = encodedFace[i]
    }

    // Write output to be replaced
    writeFileSync(PSX_OUT, source)
}

const PL00T = (body: Buffer, face: Buffer) => {

    // Encode the provided PNG buffers into the game format
    const [bodyPal, bodyImg] = encodeImage(body);
    const [facePal, faceImg] = encodeImage(face);

    // Patch the face to include the special weapons
    const PC_SRC = readFileSync(`replace/PC_IN/PL00T.DAT`);
    const { length } = PC_SRC
    const SPECIAL_WEAPON_LEN = 0x4000; // 256 x 128 
    const SPECIAL_WEAPON_IMG = PC_SRC.subarray(length - SPECIAL_WEAPON_LEN)
    
    // Fill in the second half of the image with special weapons
    faceImg.fill(SPECIAL_WEAPON_IMG, 0x4000)
    
    // Write the respective game files
    writePCFile(bodyPal, bodyImg, facePal, faceImg)
    writePSXFile(bodyPal, bodyImg, facePal, faceImg)

}

export default PL00T
export { PL00T }