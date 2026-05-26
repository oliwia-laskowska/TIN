import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';

import { palettes } from './data.js';

// Ścieżka do pliku przechowującego zapisane obrazki
const DATA_DIR = './data';
const FILE_PATH = path.join(DATA_DIR, 'images.json');

/**
 * Tworzy folder data, jeśli jeszcze nie istnieje.
 */
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

/**
 * Tworzy pusty plik images.json przy pierwszym uruchomieniu.
 */
if (!fs.existsSync(FILE_PATH)) {
  fs.writeFileSync(FILE_PATH, '[]');
}

/**
 * Wczytuje zapisane obrazki z pliku JSON.
 */
function loadImages() {
  try {
    const fileContent = fs.readFileSync(FILE_PATH, 'utf-8');
    const parsed = JSON.parse(fileContent);

    return new Map(parsed.map((image) => [image.id, image]));
  } catch {
    return new Map();
  }
}

/**
 * Zapisuje aktualny stan Mapy do pliku JSON.
 */
function saveImages() {
  const imagesArray = Array.from(images.values());

  fs.writeFileSync(
      FILE_PATH,
      JSON.stringify(imagesArray, null, 2)
  );
}

/**
 * Przechowuje obrazki w pamięci aplikacji.
 * Dane są dodatkowo synchronizowane z plikiem JSON.
 */
const images = loadImages();

/**
 * Zwraca listę wszystkich palet.
 * Klonuje obiekty, aby uniknąć modyfikacji oryginalnych danych.
 */
export function getAllPalettes() {
  return palettes.map((palette) => ({ ...palette }));
}

/**
 * Wyszukuje paletę po ID.
 * Zwraca obiekt palety lub null.
 */
export function getPaletteById(id) {
  return palettes.find((palette) => palette.id === id) ?? null;
}

/**
 * Zwraca wszystkie zapisane obrazki.
 */
export function getAllImages() {
  return Array.from(images.values()).map((image) => ({ ...image }));
}

/**
 * Pobiera pojedynczy obrazek po ID.
 */
export function getImageById(id) {
  return images.get(id) ?? null;
}

/**
 * Tworzy nowy obrazek i zapisuje go:
 * - w pamięci aplikacji,
 * - w pliku images.json.
 *
 * @throws {Error} 400 jeśli colors nie jest poprawną tablicą.
 */
export function createImage(payload) {
  const colors = payload?.colors;

  // Walidacja danych wejściowych
  if (!Array.isArray(colors) || colors.length === 0) {
    const error = new Error(
        'Pole colors musi być niepustą tablicą.'
    );

    error.statusCode = 400;

    throw error;
  }

  const image = {
    // Krótkie unikalne ID
    id: nanoid(10),

    // Domyślna nazwa, jeśli brak poprawnego title
    title:
        typeof payload.title === 'string' &&
        payload.title.trim()
            ? payload.title.trim()
            : 'pixel-editor-state',

    // Rozmiar siatki obrazka
    gridSize: Number(payload.gridSize) || 16,

    // Dane pikseli / kolorów
    colors,

    // Data utworzenia
    createdAt: new Date().toISOString()
  };

  // Dodanie obrazka do Mapy
  images.set(image.id, image);

  // Zapis do pliku JSON
  saveImages();

  // Zwracamy kopię obiektu
  return { ...image };
}

/**
 * Usuwa obrazek po ID.
 * Zwraca true, jeśli usunięto.
 */
export function deleteImage(id) {
  const wasDeleted = images.delete(id);

  // Aktualizacja pliku tylko po udanym usunięciu
  if (wasDeleted) {
    saveImages();
  }

  return wasDeleted;
}