import { describe, expect, it } from 'vitest';
import {
  detectDate,
  detectMood,
  detectTags,
  groupMaterials,
  pickMainShards,
  suggestTitle,
  annotateMaterials,
  suggestMusic,
} from '../src/ai/heuristic.js';

describe('ai/heuristic', () => {
  it('detects vivid mood for sunset / beach / city-night filenames', () => {
    expect(detectMood('beach-sunset-2025.jpg')).toBe('vivid');
    expect(detectMood('seaside-fireworks-night.jpg')).toBe('vivid');
  });

  it('detects wistful mood for autumn / city / road keywords', () => {
    expect(detectMood('autumn-city-walk.jpg')).toBe('wistful');
  });

  it('detects healing mood for forest / lake / spring / island', () => {
    expect(detectMood('forest-morning-meadow.jpg')).toBe('healing');
    expect(detectMood('island-pier.jpg')).toBe('healing');
  });

  it('falls back to null when no keyword matches', () => {
    expect(detectMood('untitled.png')).toBeNull();
  });

  it('extracts ISO date from common filename patterns', () => {
    expect(detectDate('2024-08-12-beach.png').iso).toBe('2024-08-12');
    expect(detectDate('img_2024_08_12.jpg').iso).toBe('2024-08-12');
    expect(detectDate('2024.08.12-trip.webp').iso).toBe('2024-08-12');
    expect(detectDate('untitled.png')).toBeNull();
  });

  it('returns up to three ranked tags per material', () => {
    const tags = detectTags('beach-sunset-family-trip.jpg');
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.length).toBeLessThanOrEqual(3);
    expect(tags).toContain('海边');
  });

  it('annotates materials with mood/tags/date/season', () => {
    const out = annotateMaterials([
      { id: 'a', name: '2025-08-12-beach-sunset.jpg', type: 'image' },
      { id: 'b', name: 'forest-meadow.jpg', type: 'image' },
    ], { lang: 'en' });
    expect(out[0].mood).toBe('vivid');
    expect(out[0].takenAt).toBe('2025-08-12');
    expect(out[0].season).toBe('summer');
    expect(out[1].mood).toBe('healing');
  });

  it('groups materials by year-month date', () => {
    const groups = groupMaterials([
      { id: 'a', name: '2025-08-beach.jpg' },
      { id: 'b', name: '2025-08-city.jpg' },
      { id: 'c', name: '2025-09-forest.jpg' },
    ]);
    expect(groups.find((g) => g.key === '2025-08').items.length).toBe(2);
    expect(groups.find((g) => g.key === '2025-09').items.length).toBe(1);
  });

  it('picks main shards preferring video + main-hint names', () => {
    const main = pickMainShards([
      { id: 'a', name: 'a.jpg', type: 'image' },
      { id: 'b', name: 'b.mp4', type: 'video' },
      { id: 'c', name: 'main.jpg', type: 'image' },
      { id: 'd', name: 'd.jpg', type: 'image' },
    ], 2);
    expect(main.length).toBe(2);
    expect(main.map((m) => m.id)).toContain('b');
    expect(main.map((m) => m.id)).toContain('c');
  });

  it('builds a Chinese title including year, season and a trip template', () => {
    const title = suggestTitle([
      { id: 'a', name: '2025-08-beach-sunset.jpg' },
      { id: 'b', name: '2025-08-seaside-loop.mp4' },
    ], 'zh');
    expect(title).toContain('2025');
    expect(title).toContain('夏天');
  });

  it('maps mood to a music hint', () => {
    expect(suggestMusic([{ name: 'beach-sunset.jpg' }]).genre).toBe('upbeat');
    expect(suggestMusic([{ name: 'forest-meadow.jpg' }]).genre).toBe('ambient');
    expect(suggestMusic([{ name: 'untitled.png' }]).genre).toBe('cinematic');
  });
});
