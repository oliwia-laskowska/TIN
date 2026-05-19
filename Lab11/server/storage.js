import { nanoid } from 'nanoid';
import { palettes } from './data.js';

const images = new Map();

export function getAllPalettes() {
  return palettes.map((palette) => ({ ...palette }));
}

export function getPaletteById(id) {
  return palettes.find((palette) => palette.id === id) ?? null;
}

export function getAllImages() {
  return Array.from(images.values()).map((image) => ({ ...image }));
}

export function getImageById(id) {
  return images.get(id) ?? null;
}

export function createImage(payload) {
  const colors = payload?.colors;

  if (!Array.isArray(colors) || colors.length === 0) {
    const error = new Error('Pole colors musi być niepustą tablicą.');
    error.statusCode = 400;
    throw error;
  }

  const image = {
    id: nanoid(10),
    title: typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : 'pixel-editor-state',
    gridSize: Number(payload.gridSize) || 16,
    colors,
    createdAt: new Date().toISOString()
  };

  images.set(image.id, image);
  return { ...image };
}

export function deleteImage(id) {
  return images.delete(id);
}
