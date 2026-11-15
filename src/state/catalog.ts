/** Catalogue des objets cosmétiques : skins et accessoires de Layjou. */

export type Slot = 'skin' | 'head' | 'face' | 'neck';

export interface Item {
  id: string;
  slot: Slot;
  /** prix : en boulons (coins) OU en crédits ; rien = offert */
  coins?: number;
  credits?: number;
  /** couleurs d'aperçu (pastille) */
  swatch?: [string, string];
}

export const ITEMS: Item[] = [
  { id: 'classic', slot: 'skin', swatch: ['#12C9D6', '#FF4F9A'] },
  { id: 'bubblegum', slot: 'skin', coins: 1200, swatch: ['#FF3FA4', '#3ED2EA'] },
  { id: 'jungle', slot: 'skin', coins: 2500, swatch: ['#12D05E', '#FF9A3D'] },
  { id: 'lava', slot: 'skin', coins: 4000, swatch: ['#F03A24', '#FFD23F'] },
  { id: 'galaxy', slot: 'skin', credits: 250, swatch: ['#7B4DF0', '#3FE0C8'] },
  { id: 'ninja', slot: 'skin', credits: 400, swatch: ['#2B3048', '#7CF03A'] },
  { id: 'gold', slot: 'skin', credits: 500, swatch: ['#FFB81F', '#E5354B'] },

  { id: 'partyhat', slot: 'head', coins: 600 },
  { id: 'tophat', slot: 'head', coins: 1500 },
  { id: 'crown', slot: 'head', credits: 200 },

  { id: 'shades', slot: 'face', coins: 800 },
  { id: 'hearts', slot: 'face', credits: 120 },

  { id: 'bowtie', slot: 'neck', coins: 500 },
  { id: 'scarf', slot: 'neck', coins: 1000 },
  { id: 'cape', slot: 'neck', credits: 180 },
];

export const itemById = (id: string): Item | undefined => ITEMS.find((i) => i.id === id);
export const itemsBySlot = (slot: Slot): Item[] => ITEMS.filter((i) => i.slot === slot);
