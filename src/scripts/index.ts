import getEntityList from "./getEntityList";

type SaveState = {
  mem: ArrayBuffer;
  vram: ArrayBuffer;
};

type EntityHeader = {
  id: string;
  name: string;
  meshOfs: number;
  tracksOfs: number;
  controlOfs: number;
};

type PostMessage = {
  type: string;
  mem?: ArrayBuffer;
  entity?: EntityHeader;
  index?: number;
};

export type { SaveState, EntityHeader, PostMessage };
export { getEntityList };
