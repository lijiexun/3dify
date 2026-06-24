export type DepthMap = {
  width: number;
  height: number;
  data: Float32Array;
};

export function createFallbackDepthMap(image: HTMLImageElement, sampleSize = 180): DepthMap {
  const aspect = image.naturalWidth / image.naturalHeight;
  const width = aspect >= 1 ? sampleSize : Math.max(64, Math.round(sampleSize * aspect));
  const height = aspect >= 1 ? Math.max(64, Math.round(sampleSize / aspect)) : sampleSize;
  const data = new Float32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / Math.max(1, width - 1);
      const v = y / Math.max(1, height - 1);
      const cx = (u - 0.5) / 0.56;
      const cy = (v - 0.52) / 0.7;
      const center = Math.max(0, 1 - Math.sqrt(cx * cx + cy * cy));
      const distance = (1 - v) * 0.15;

      data[y * width + x] = 0.18 + center * 0.68 + distance;
    }
  }

  return {
    width,
    height,
    data: smoothDepth(normalizeDepthPercentile(data), width, height, 8),
  };
}

export function prepareDepthForRendering(depthMap: DepthMap): DepthMap {
  const radius = 10;
  const clipped = normalizeDepthPercentile(depthMap.data, 3, 97);
  const smoothed = smoothDepth(clipped, depthMap.width, depthMap.height, radius);

  return {
    ...depthMap,
    data: flattenBackground(normalizeDepthPercentile(smoothed, 4, 96), 0.42),
  };
}

export function sampleDepth(depthMap: DepthMap, u: number, v: number) {
  const x = Math.max(0, Math.min(depthMap.width - 1, Math.round(u * (depthMap.width - 1))));
  const y = Math.max(0, Math.min(depthMap.height - 1, Math.round((1 - v) * (depthMap.height - 1))));
  return depthMap.data[y * depthMap.width + x] ?? 0;
}

export function normalizeDepthPercentile(depth: Float32Array, lowPercentile = 2, highPercentile = 98) {
  const sorted = Array.from(depth).sort((a, b) => a - b);
  const low = percentile(sorted, lowPercentile);
  const high = percentile(sorted, highPercentile);
  const range = high - low || 1;
  const normalized = new Float32Array(depth.length);

  for (let index = 0; index < depth.length; index += 1) {
    normalized[index] = Math.max(0, Math.min(1, (depth[index] - low) / range));
  }

  return normalized;
}

function flattenBackground(depth: Float32Array, amount: number) {
  const output = new Float32Array(depth.length);

  for (let index = 0; index < depth.length; index += 1) {
    const value = depth[index];
    const farWeight = Math.max(0, 1 - value * 1.65);
    output[index] = value * (1 - farWeight * amount);
  }

  return output;
}

function smoothDepth(depth: Float32Array, width: number, height: number, radius: number) {
  const horizontal = new Float32Array(depth.length);
  const output = new Float32Array(depth.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;

      for (let offset = -radius; offset <= radius; offset += 1) {
        const sx = Math.max(0, Math.min(width - 1, x + offset));
        sum += depth[y * width + sx];
        count += 1;
      }

      horizontal[y * width + x] = sum / count;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;

      for (let offset = -radius; offset <= radius; offset += 1) {
        const sy = Math.max(0, Math.min(height - 1, y + offset));
        sum += horizontal[sy * width + x];
        count += 1;
      }

      output[y * width + x] = sum / count;
    }
  }

  return output;
}

function percentile(sortedValues: number[], percentileValue: number) {
  const index = Math.max(0, Math.min(sortedValues.length - 1, Math.round((percentileValue / 100) * (sortedValues.length - 1))));
  return sortedValues[index] ?? 0;
}
