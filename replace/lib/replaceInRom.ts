import { readFileSync, writeFileSync, readdirSync } from 'fs'

type OffsetList = {
    filename: string;
    isCompressed: boolean;
    start: number;
    end: number;
}

const searchROM = (needle: Buffer, haystack: Buffer, name: string) => {

    console.log('Searching for %s in ROM', name)
    const segments: Buffer[] = [];
    const len = Math.ceil(needle.length / 0x800);

    // First we split the file into segments
    for (let i = 0; i < len; i++) {
        const start = i * 0x800;
        const end = (i + 1) * 0x800
        const stop = needle.length < end ? needle.length : end;
        const segment = needle.subarray(start, stop);
        segments.push(segment);
    }

    // Then we look for possible locations of the first segement
    const locations: number[] = [];
    let index = 0;
    while (index !== -1) {
        console.log("Searching from offset: 0x%s", index.toString(16))
        index = haystack.indexOf(segments[0], index)

        if (index === -1) {
            break
        }

        locations.push(index);
        index++;

    }

    while (locations.length) {
        // Start from the end to avoid collisions
        const location = locations.pop();

        if (!location) {
            break;
        }

        // Set the location to start from
        let last = location;
        let found = true;
        for (let i = 0; i < segments.length; i++) {
            const segement = segments[i];
            const index = haystack.indexOf(segement, last);
            if (index === -1) {
                found = false;
                break;
            }

            if (i > 0 && i < segments.length - 1) {
                if (index - last !== 0x930) {
                    found = false;
                    break;
                }
            } else if (i === segments.length - 1) {
                const diff = index - last
                if (diff < 0x800 || diff > 0x950) {
                    found = false;
                    break;
                }
            }
            last = index;
        }

        if (found) {
            console.log('Replace complete!!')
            return location;
        }
    }

    throw new Error("Could not find " + name + " in ROM")
}

const replaceInRom = (file: Buffer, filepos: number, ROM: Buffer) => {
    const len = Math.ceil(file.length / 0x800);
    const segments: Buffer[] = [];

    // First we split the file into segments
    for (let i = 0; i < len; i++) {
        const start = i * 0x800;
        const end = (i + 1) * 0x800
        const stop = file.length < end ? file.length : end;
        const segment = file.subarray(start, stop);
        segments.push(segment);
    }

    // Then copy it over to the ROM
    let ofs = filepos;
    segments.forEach(segment => {
        for (let i = 0; i < 0x800; i++) {
            ROM[ofs + i] = segment[i]
        }
        ofs += 0x930;
    })
}


const updateROM = () => {

    const PSX_IN = './PSX_IN'
    const PSX_OUT = './PSX_OUT'
    
    const PSX_ARCHIVES = readdirSync('replace/PSX_OUT');
    const ROM = readFileSync('/home/kion/.pcsxr/roms/TRACK_01_READONLY.bin');

    PSX_ARCHIVES.forEach((name) => {
        const srcFile = readFileSync(`replace/${PSX_IN}/${name}`);
        const dstFile = readFileSync(`replace/${PSX_OUT}/${name}`);
        const offset = searchROM(srcFile, ROM, name)
        console.log("Replacing in ROM: 0x%s", offset.toString(16));
        replaceInRom(dstFile, offset, ROM)
    })

    writeFileSync('/home/kion/.pcsxr/roms/Mega Man Legends 2 (USA) (Track 1).bin', ROM)

}


export default updateROM
export { updateROM }