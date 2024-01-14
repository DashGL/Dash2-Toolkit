const encodeBitfield = (bits: boolean[]):Buffer => {

    const length = Math.ceil(bits.length / 32) * 4;
    
    let ofs = 0;
    const buffer = Buffer.alloc(length);
    const dword = new Uint32Array(1);

    for(let i = 0; i < bits.length; i+= 32) {
        dword[0] = 0;
        bits[i + 0] && (dword[0] |= 0x80000000)
        bits[i + 1] && (dword[0] |= 0x40000000)
        bits[i + 2] && (dword[0] |= 0x20000000)
        bits[i + 3] && (dword[0] |= 0x10000000)

        bits[i + 4] && (dword[0] |= 0x8000000)
        bits[i + 5] && (dword[0] |= 0x4000000)
        bits[i + 6] && (dword[0] |= 0x2000000)
        bits[i + 7] && (dword[0] |= 0x1000000)

        bits[i + 8] && (dword[0] |= 0x800000)
        bits[i + 9] && (dword[0] |= 0x400000)
        bits[i + 10] && (dword[0] |= 0x200000)
        bits[i + 11] && (dword[0] |= 0x100000)

        bits[i + 12] && (dword[0] |= 0x80000)
        bits[i + 13] && (dword[0] |= 0x40000)
        bits[i + 14] && (dword[0] |= 0x20000)
        bits[i + 15] && (dword[0] |= 0x10000)

        bits[i + 16] && (dword[0] |= 0x8000)
        bits[i + 17] && (dword[0] |= 0x4000)
        bits[i + 18] && (dword[0] |= 0x2000)
        bits[i + 19] && (dword[0] |= 0x1000)

        bits[i + 20] && (dword[0] |= 0x800)
        bits[i + 21] && (dword[0] |= 0x400)
        bits[i + 22] && (dword[0] |= 0x200)
        bits[i + 23] && (dword[0] |= 0x100)

        bits[i + 24] && (dword[0] |= 0x80)
        bits[i + 25] && (dword[0] |= 0x40)
        bits[i + 26] && (dword[0] |= 0x20)
        bits[i + 27] && (dword[0] |= 0x10)

        bits[i + 28] && (dword[0] |= 0x8)
        bits[i + 29] && (dword[0] |= 0x4)
        bits[i + 30] && (dword[0] |= 0x2)
        bits[i + 31] && (dword[0] |= 0x1)

        buffer.writeUInt32LE(dword[0], ofs)
        ofs += 4;
    }

    return buffer;
}

const compressSegment = (segment: Buffer) => {

    // Create a boolean array and out buffer
    const bucket: boolean[] = [];
    
    // Worst case scenario, can't compress anything and
    // 0xffff is added to the end, this is likely to happen in last segment
    const compressed = Buffer.alloc(segment.length + 2)

    // Number of min and max number of words to match
    const MAX_CAP = 9;
    const MIN_CAP = 2;

    let inOfs = 0;
    let outOfs = 0;

    do {
        // Check ahead
        let found = false;
        const wordsLeft = (segment.length - inOfs) / 2;
        const maxCount = wordsLeft < MAX_CAP ? wordsLeft : MAX_CAP;

        // Check ahead

        for (let count = maxCount; count >= MIN_CAP; count--) {
            const len = count * 2
            const needle = segment.subarray(inOfs, inOfs + len)
            const window = segment.subarray(0, inOfs);
            const needleOfs = window.indexOf(needle);

            if (needleOfs === -1) {
                continue;
            }

            found = true;
            const lowBits = count - 2;
            const highBits = needleOfs << 3
            const word = highBits | lowBits;
            compressed.writeUInt16LE(word, outOfs);
            bucket.push(true);
            outOfs += 2;
            inOfs += len;
            break;
        }

        if (!found) {
            const word = segment.readUInt16LE(inOfs);
            inOfs += 2;
            bucket.push(false);
            compressed.writeUInt16LE(word, outOfs);
            outOfs += 2;
        }

    } while (inOfs < segment.length)

    // Write a true bit and 0xffff to finish the segment
    bucket.push(true);
    compressed.writeUInt16LE(0xffff, outOfs);
    outOfs += 2;

    const payload = compressed.subarray(0, outOfs);
    return { bucket, payload };
}

const compressImage = (decompressed: Buffer) => {
    const SEGMENT_LENGTH = 0x2000;
    const { length } = decompressed
    const count = Math.ceil(length/SEGMENT_LENGTH);

    const bits: boolean[] = []
    const payloads: Buffer[] = []

    for(let i = 0; i < count; i++) {
        console.log('Compressing segment %s of %s', i +1 , count)
        const WINDOW_END = (i + 1) * SEGMENT_LENGTH
        const end =  WINDOW_END < length ? WINDOW_END : length;
        const start = i * SEGMENT_LENGTH;
        const segment = decompressed.subarray(start, end);
        const { bucket, payload } = compressSegment(segment);
        bucket.forEach( bit => {bits.push(bit)})
        payloads.push(payload);
    }

    const bitfied = encodeBitfield(bits)
    const payload = Buffer.concat(payloads)

    return [ bitfied, payload ] 
}

export default compressImage;
export { compressImage }