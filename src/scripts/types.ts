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

export type { SaveState, EntityHeader };
