import { beforeEach, describe, expect, it } from 'vitest';
import * as materialRouter from '../src/upload/material-router.js';

describe('material-router', () => {
  beforeEach(() => {
    window.SM = { materials: [] };
  });

  it('hydrates preset demo materials when none exist', () => {
    materialRouter.init();

    expect(window.SM.materials).toHaveLength(6);
    expect(window.SM.materials[0].url).toContain('assets/fallback/memory-01.svg');
  });
});
