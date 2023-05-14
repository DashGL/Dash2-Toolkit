 /*

	Copyright (C) 2023 DashGL - Benjamin Collins
	This file is part of MML2 StateViewer

	MML2 StateViewer is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	MML2 StateViewer is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with MML2 StateViewer. If not, see <http://www.gnu.org/licenses/>.

*/

import {
	Bone,
	BufferGeometry,
	Float32BufferAttribute,
	Matrix4,
	MeshBasicMaterial,
	Skeleton,
	SkinnedMesh,
	Uint16BufferAttribute,
	Vector3,
	Texture,
} from 'three'

import { setEntity } from '@/main'
import { renderTexture } from '@/Frambuffer'
import ByteReader from 'bytereader'

type FaceIndex = {
    materialIndex: number
    boneIndex: number
    x: number
    y: number
    z: number
    u: number
    v: number
}

type WeightedVertex = {
    pos: Vector3
    boneIndex: number
}

type DrawCall = {
    start: number
    count: number
    materialIndex: number
}


const SCALE = 0.00125
const ROT = new Matrix4()
ROT.makeRotationX(Math.PI)

const VERTEX_MASK = 0b1111111111
const VERTEX_MSB = 0b1000000000
const VERTEX_LOW = 0b0111111111


const readEntity = (
	reader: ByteReader, 
	name: string,
	meshOfs: number,
	_trackOfs: number,
	_controlOfs: number,
) => {

	console.log('reading mesh');
	const mesh = parseMesh(reader, meshOfs)
	mesh.name = name
	setEntity( mesh )
 
}

const parseMesh = (
	reader: ByteReader,
	meshOfs: number,
) => {

	reader.seek(meshOfs)
	// Get number of defined
	const submeshCount = reader.readUInt8();

	// Read the Level-of-Detail Mesh Offsets
	reader.seek(meshOfs + 4)
	const geometryOfs = reader.readUInt32();

	// Get the offset to the bones
	reader.seek(meshOfs + 0x10)
	const skeletonOfs = reader.readUInt32();
	const heirarchyOfs = reader.readUInt32();

	// Get offset to the textures
	const textureOfs = reader.readUInt32();
	const collisionOfs = reader.readUInt32();
	const shadowOfs = reader.readUInt32();

	// Read Bones
	const bones: Bone[] = []
	const nbBones = Math.floor((heirarchyOfs - skeletonOfs) / 6)
	reader.seek(skeletonOfs)
	for (let i = 0; i < nbBones; i++) {
		// Read Bone Position
		const x = reader.readInt16();
		const y = reader.readInt16();
		const z = reader.readInt16();

		// Create Threejs Bone
		const bone = new Bone()
		bone.name = `bone_${i.toString().padStart(3, '0')}`
		const vec3 = new Vector3(x, y, z)
		vec3.multiplyScalar(SCALE)
		vec3.applyMatrix4(ROT)
		bone.position.x = vec3.x
		bone.position.y = vec3.y
		bone.position.z = vec3.z
		bones.push(bone)
	}

	// Read hierarchy
	console.log('hierarchy')
	const hierarchy = []
	const nbSegments = (textureOfs - heirarchyOfs) / 4
	reader.seek(heirarchyOfs)
	for (let i = 0; i < nbSegments; i++) {
		const polygonIndex = reader.readInt8();
		const boneParent = reader.readInt8();
		const boneIndex = reader.readUInt8();
		const flags = reader.readUInt8();
		const hidePolygon = Boolean(flags & 0x80)
		const shareVertices = Boolean(flags & 0x40)

		if (bones[boneIndex] && bones[boneParent] && !bones[boneIndex].parent) {
			bones[boneParent].add(bones[boneIndex])
		}

		if (flags & 0x3f) {
			console.error(`Unknown Flag: 0x${(flags & 0x3f).toString(16)}`)
		}

		hierarchy.push({
			polygonIndex,
			boneIndex,
			boneParent,
			hidePolygon,
			shareVertices,
		})
	}

	bones.forEach((bone) => {
		bone.updateMatrix()
		bone.updateMatrixWorld()
	})

	// Read Geometry
	const vertices: WeightedVertex[] = []
	const faces: FaceIndex[] = []
	for (let i = 0; i < submeshCount; i++) {

		// Read triangle offset and count
		reader.seek(geometryOfs + (i * 0x10))
		const faceTriCount = reader.readUInt8();
		const faceQuadCount = reader.readUInt8();
		const vertexCount = reader.readUInt8();
		const scaleBytes = reader.readUInt8();
		const triFaceOfs = reader.readUInt32();
		const quadFaceOfs = reader.readUInt32();
		const vertexOfs = reader.readUInt32();

		// Read Scale
		const scale = scaleBytes === -1 ? 0.5 : 1 << scaleBytes
		const { boneIndex, boneParent, shareVertices } = hierarchy[i]
		const bone = bones[boneIndex]
		
		// Read Vertices
		const localIndices: WeightedVertex[] = readVertex(
			reader,
			vertexOfs,
			vertexCount,
			scale,
			bone,
			shareVertices,
			vertices,
			boneIndex,
			boneParent
		)

		// Read Triangles Faces
		readFace(reader, triFaceOfs, faceTriCount, false, localIndices, faces)
		// Read Quad Faces
		readFace(reader, quadFaceOfs, faceQuadCount, true, localIndices, faces)
	}

	const mats = []
	if(textureOfs) {
		reader.seek(textureOfs)
		const textureCount = ((collisionOfs || shadowOfs) - textureOfs) / 4;
		for (let i = 0; i < textureCount; i++) {
			const imageCoords = reader.readUInt16();
			const paletteCoords = reader.readUInt16();

			const canvas = renderTexture(imageCoords, paletteCoords);
            const texture = new Texture(canvas);
            texture.flipY = false;
            texture.needsUpdate = true;
            mats[i] = new MeshBasicMaterial({
                map : texture,
				transparent: true,
				alphaTest: 0.1
            });

		}

	}

	
	if(!mats.length) {
		mats.push(new MeshBasicMaterial({
			color: 0xff0000,
		}))
		mats.push(new MeshBasicMaterial({
			color: 0x00ff00,
		}))
		mats.push(new MeshBasicMaterial({
			color: 0x0000ff,
		}))
		mats.push(new MeshBasicMaterial({
			color: 0xffff00,
		}))
	}

	const geometry = createBufferGeometry(faces)
	const mesh = new SkinnedMesh(geometry, mats)
	const skeleton = new Skeleton(bones)

	const rootBone = skeleton.bones[0]
	mesh.add(rootBone)
	mesh.bind(skeleton)
	return mesh

}

const readVertex = (
	reader: ByteReader,
	vertexOffset: number,
	vertexCount: number,
	scale: number,
	bone: Bone,
	shareVertices: boolean,
	vertices: WeightedVertex[],
	boneIndex: number,
	boneParent: number
) => {

	const localIndices: WeightedVertex[] = []
	reader.seek(vertexOffset)
	const haystack = bone.parent
		? vertices
			  .filter((v) => {
				  return v.boneIndex === boneParent
			  })
			  .map((v) => {
				  const { x, y, z } = v.pos
				  return [x.toFixed(2), y.toFixed(2), z.toFixed(2)].join(',')
			  })
		: []

	for (let i = 0; i < vertexCount; i++) {
		const dword = reader.readUInt32();
		const xBytes = (dword >> 0x00) & VERTEX_MASK
		const yBytes = (dword >> 0x0a) & VERTEX_MASK
		const zBytes = (dword >> 0x14) & VERTEX_MASK

		const xHigh = (xBytes & VERTEX_MSB) * -1
		const xLow = xBytes & VERTEX_LOW

		const yHigh = (yBytes & VERTEX_MSB) * -1
		const yLow = yBytes & VERTEX_LOW

		const zHigh = (zBytes & VERTEX_MSB) * -1
		const zLow = zBytes & VERTEX_LOW

		const vec3 = new Vector3(
			(xHigh + xLow) * scale,
			(yHigh + yLow) * scale,
			(zHigh + zLow) * scale
		)
		vec3.multiplyScalar(SCALE)
		vec3.applyMatrix4(ROT)
		vec3.applyMatrix4(bone.matrixWorld)

		const vertex: WeightedVertex = {
			pos: vec3,
			boneIndex,
		}

		// If the flag is set for weighted vertices, we check to see
		// if a vertex with the same position has already been declared
		if (shareVertices) {
			const { x, y, z } = vec3
			const needle = [x.toFixed(2), y.toFixed(2), z.toFixed(2)].join(',')
			if (haystack.indexOf(needle) !== -1) {
				vertex.boneIndex = boneParent
			}
		}

		localIndices.push(vertex)
		vertices.push(vertex)
	}

	return localIndices
}

const createBufferGeometry = (faces: FaceIndex[]) => {
	const geometry = new BufferGeometry()
	const pos: number[] = []
	const uvs: number[] = []
	const skinIndices: number[] = []
	const skinWeights: number[] = []
	const drawCalls: DrawCall[] = []

	faces.forEach((face, index) => {
		const { x, y, z, u, v, boneIndex, materialIndex } = face
		pos.push(x, y, z)
		uvs.push(u, v)
		skinIndices.push(boneIndex, 0, 0, 0)
		skinWeights.push(1, 0, 0, 0)

		if (!drawCalls.length) {
			drawCalls.push({
				start: 0,
				count: 1,
				materialIndex,
			})
		} else {
			const group = drawCalls[drawCalls.length - 1]
			if (group.materialIndex === materialIndex) {
				group.count++
			} else {
				drawCalls.push({
					start: index,
					count: 1,
					materialIndex,
				})
			}
		}
	})

	drawCalls.forEach(({ start, count, materialIndex }) => {
		geometry.addGroup(start, count, materialIndex)
	})

	geometry.setAttribute('position', new Float32BufferAttribute(pos, 3))
	geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
	geometry.setAttribute(
		'skinIndex',
		new Uint16BufferAttribute(skinIndices, 4)
	)
	geometry.setAttribute(
		'skinWeight',
		new Float32BufferAttribute(skinWeights, 4)
	)
	geometry.computeVertexNormals()

	return geometry
}

const readFace = (
	reader: ByteReader,
	faceOffset: number,
	faceCount: number,
	isQuad: boolean,
	localIndices: WeightedVertex[],
	faces: FaceIndex[]
) => {
	const FACE_MASK = 0b1111111
	const PIXEL_TO_FLOAT_RATIO = 0.00390625
	const PIXEL_ADJUSTMEST = 0.001953125

	reader.seek(faceOffset);
	for (let i = 0; i < faceCount; i++) {
		

		const au = reader.readUInt8();
		const av = reader.readUInt8();
		const bu = reader.readUInt8();
		const bv = reader.readUInt8();
		const cu = reader.readUInt8();
		const cv = reader.readUInt8();
		const du = reader.readUInt8();
		const dv = reader.readUInt8();
		
		const dword = reader.readUInt32();
		const materialIndex = (dword >> 28) & 0x3

		const indexA = (dword >> 0x00) & FACE_MASK
		const indexB = (dword >> 0x07) & FACE_MASK
		const indexC = (dword >> 0x0e) & FACE_MASK
		const indexD = (dword >> 0x15) & FACE_MASK

		const a: FaceIndex = {
			materialIndex,
			boneIndex: localIndices[indexA].boneIndex,
			x: localIndices[indexA].pos.x,
			y: localIndices[indexA].pos.y,
			z: localIndices[indexA].pos.z,
			u: au * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
			v: av * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
		}

		const b: FaceIndex = {
			materialIndex,
			boneIndex: localIndices[indexB].boneIndex,
			x: localIndices[indexB].pos.x,
			y: localIndices[indexB].pos.y,
			z: localIndices[indexB].pos.z,
			u: bu * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
			v: bv * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
		}

		const c: FaceIndex = {
			materialIndex,
			boneIndex: localIndices[indexC].boneIndex,
			x: localIndices[indexC].pos.x,
			y: localIndices[indexC].pos.y,
			z: localIndices[indexC].pos.z,
			u: cu * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
			v: cv * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
		}

		const d: FaceIndex = {
			materialIndex,
			boneIndex: localIndices[indexD].boneIndex,
			x: localIndices[indexD].pos.x,
			y: localIndices[indexD].pos.y,
			z: localIndices[indexD].pos.z,
			u: du * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
			v: dv * PIXEL_TO_FLOAT_RATIO + PIXEL_ADJUSTMEST,
		}

		faces.push(a, c, b)

		if (!isQuad) {
			continue
		}

		faces.push(b, c, d)
	}
}

export { readEntity }
