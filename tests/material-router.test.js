import { beforeEach, describe, expect, it } from 'vitest';
import * as materialRouter from '../src/upload/material-router.js';

describe('material-router', () => {
  beforeEach(() => {
    window.SM = {
      materials: [],
      materialAssignments: [],
      bus: { emit() {} },
    };
  });

  it('hydrates preset demo materials when none exist', () => {
    materialRouter.init();

    expect(window.SM.materials).toHaveLength(8);
    expect(window.SM.materialAssignments).toHaveLength(8);
    expect(window.SM.materials[0].url).toContain('assets/fallback/travel-media/travel-01-seaside.png');
    expect(window.SM.materials.some((item) => item.type === 'video')).toBe(true);
  });

  it('pads assignments up to six shards when too few images exist', () => {
    const assignments = materialRouter.buildDisplayAssignments([
      { id: 'a', url: 'a.png' },
      { id: 'b', url: 'b.png' },
      { id: 'c', url: 'c.png' },
    ]);

    expect(assignments).toHaveLength(6);
    expect(new Set(assignments.map((item) => item.sourceId)).size).toBe(3);
  });

  it('keeps one shard per uploaded image when count is above six', () => {
    const materials = Array.from({ length: 20 }, (_, index) => ({
      id: `m-${index}`,
      url: `memory-${index}.png`,
    }));

    const assignments = materialRouter.buildDisplayAssignments(materials);

    expect(assignments).toHaveLength(20);
    expect(new Set(assignments.map((item) => item.sourceId)).size).toBe(20);
  });

  it('classifies pano-like names separately from normal png/jpg uploads', () => {
    const flat = materialRouter.inferProjection({ name: 'family-trip.jpg', type: 'image/jpeg' });
    const pano = materialRouter.inferProjection({ name: 'beach-panorama.png', type: 'image/png' });
    const video = materialRouter.inferProjection({ name: 'night-drive.mp4', type: 'video/mp4' });
    const panoVideo = materialRouter.inferProjection({ name: 'desert-360.mp4', type: 'video/mp4' });

    expect(flat.projection).toBe('flat');
    expect(flat.distortionProfile).toBe('sphere-crop');
    expect(pano.projection).toBe('panorama');
    expect(pano.distortionProfile).toBe('sphere-equirect');
    expect(video.projection).toBe('flat');
    expect(video.distortionProfile).toBe('sphere-video-crop');
    expect(panoVideo.projection).toBe('panorama');
    expect(panoVideo.distortionProfile).toBe('sphere-video-equirect');
  });
});
