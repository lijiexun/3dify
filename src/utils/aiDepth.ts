import type { DepthMap } from './depthMap';
import { normalizeDepthPercentile } from './depthMap';

const DEPTH_MODEL_ID = 'onnx-community/depth-anything-v2-small';

type TensorLike = {
  data?: Float32Array | number[];
  dims?: number[];
};

type RawImageLike = {
  data?: Uint8Array | Uint8ClampedArray | Float32Array;
  width?: number;
  height?: number;
  channels?: number;
};

type DepthResult = {
  predicted_depth?: TensorLike;
  depth?: RawImageLike;
};

type DepthEstimator = (input: string) => Promise<DepthResult | DepthResult[]>;

let depthPipelinePromise: Promise<DepthEstimator> | null = null;

export async function estimateDepthWithAi(imageUrl: string): Promise<DepthMap | null> {
  try {
    const estimator = await getDepthPipeline();
    const result = await estimator(imageUrl);
    const firstResult = Array.isArray(result) ? result[0] : result;

    if (!firstResult) {
      return null;
    }

    return depthResultToMap(firstResult);
  } catch (error) {
    console.warn('AI depth unavailable', error);
    return null;
  }
}

async function getDepthPipeline() {
  depthPipelinePromise ??= createDepthPipeline();

  try {
    return await depthPipelinePromise;
  } catch (error) {
    depthPipelinePromise = null;
    throw error;
  }
}

async function createDepthPipeline(): Promise<DepthEstimator> {
  const { pipeline, env } = await import('@huggingface/transformers');
  env.allowLocalModels = false;
  env.allowRemoteModels = true;

  try {
    const estimator = await pipeline('depth-estimation', DEPTH_MODEL_ID, { device: 'webgpu' });
    return estimator as unknown as DepthEstimator;
  } catch (error) {
    console.warn('WebGPU depth model load failed; retrying with default backend.', error);
    const estimator = await pipeline('depth-estimation', DEPTH_MODEL_ID);
    return estimator as unknown as DepthEstimator;
  }
}

function depthResultToMap(result: DepthResult): DepthMap | null {
  const tensorMap = tensorToDepthMap(result.predicted_depth);

  if (tensorMap) {
    return tensorMap;
  }

  return rawImageToDepthMap(result.depth);
}

function tensorToDepthMap(tensor?: TensorLike): DepthMap | null {
  const data = tensor?.data;
  const dims = tensor?.dims;

  if (!data || !dims?.length) {
    return null;
  }

  const width = dims[dims.length - 1];
  const height = dims[dims.length - 2];

  if (!width || !height) {
    return null;
  }

  return {
    width,
    height,
    data: normalizeDepthPercentile(Float32Array.from(data), 2, 98),
  };
}

function rawImageToDepthMap(image?: RawImageLike): DepthMap | null {
  if (!image?.data || !image.width || !image.height) {
    return null;
  }

  const channelCount = image.channels || Math.max(1, Math.round(image.data.length / (image.width * image.height)));
  const data = new Float32Array(image.width * image.height);

  for (let index = 0; index < data.length; index += 1) {
    data[index] = Number(image.data[index * channelCount]) / 255;
  }

  return {
    width: image.width,
    height: image.height,
    data: normalizeDepthPercentile(data, 2, 98),
  };
}
