import { readFileSync } from 'fs'
import PL00T from './src/PL00T'
import PL00P010 from './src/PL00P010'
import updateROM from './lib/replaceInRom'


const SRC_DIR = 'MIKU_MODEL'

// Encode the player texture
try {
    const body = readFileSync(`replace/${SRC_DIR}/default_body.png`)
    const face = readFileSync(`replace/${SRC_DIR}/default_face.png`)
    PL00T(body, face)
} catch(err) {
    console.warn("--- Unable to Encode Player Texture ---")
    throw err;
}

// Encode the player model
try {

    // Body
    const body: [string, string, string, string, string, string] = [
        readFileSync(`replace/${SRC_DIR}/a00_BODY.OBJ`, 'ascii'),
        readFileSync(`replace/${SRC_DIR}/a01_HIPS.OBJ`, 'ascii'),
        readFileSync(`replace/${SRC_DIR}/a02_LEG_RIGHT_TOP.OBJ`, 'ascii'),
        readFileSync(`replace/${SRC_DIR}/a03_LEG_RIGHT_BOTTOM.OBJ`, 'ascii'),
        readFileSync(`replace/${SRC_DIR}/a04_LEG_LEFT_TOP.OBJ`, 'ascii'),
        readFileSync(`replace/${SRC_DIR}/a05_LEG_LEFT_BOTTOM.OBJ`, 'ascii')
    ]

    PL00P010(body);
} catch (err) {
    console.warn("--- Unable to Encode Player Model ---")
    throw err;
}

updateROM();