import { describe, expect, it } from 'vitest';
import { decodePolyline } from '@/lib/providers/shapes';

describe('polyline decoding', () => {
  it('decodes the reference example (precision 5)', () => {
    // from Google's polyline docs: (38.5,-120.2), (40.7,-120.95), (43.252,-126.453)
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5);
    expect(pts).toHaveLength(3);
    expect(pts[0][0]).toBeCloseTo(-120.2, 5);
    expect(pts[0][1]).toBeCloseTo(38.5, 5);
    expect(pts[2][0]).toBeCloseTo(-126.453, 5);
    expect(pts[2][1]).toBeCloseTo(43.252, 5);
  });
});
