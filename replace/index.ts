import { readFileSync } from 'fs'
import PL00T from './src/PL00T'
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

updateROM();