import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from './cosine.js';

describe('cosineSimilarity', () => {
  it('calculates perfect similarity for identical vectors', () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0);
  });

  it('calculates zero similarity for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
  });

  it('calculates opposite similarity for opposite vectors', () => {
    const a = [1, 1];
    const b = [-1, -1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0);
  });

  it('throws an error for vectors of different lengths', () => {
    const a = [1, 2];
    const b = [1, 2, 3];
    expect(() => cosineSimilarity(a, b)).toThrow('Vectors must be of the same length');
  });

  it('handles zero vectors safely', () => {
    const a = [0, 0];
    const b = [1, 1];
    expect(cosineSimilarity(a, b)).toBe(0);
  });
});
