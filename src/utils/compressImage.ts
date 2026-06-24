const targetBytes = 100 * 1024;
const minQuality = 0.34;
const initialQuality = 0.82;
const qualityStep = 0.08;
const minMaxDimension = 520;
const initialMaxDimension = 1600;

export async function compressImageFile(file: File) {
  if (file.size <= targetBytes) {
    return URL.createObjectURL(file);
  }

  const image = await loadImage(file);
  let maxDimension = initialMaxDimension;
  let bestBlob: Blob | null = null;

  while (maxDimension >= minMaxDimension) {
    const canvas = drawScaledImage(image, maxDimension);

    for (let quality = initialQuality; quality >= minQuality; quality -= qualityStep) {
      const blob = await canvasToJpegBlob(canvas, quality);

      if (!bestBlob || blob.size < bestBlob.size) {
        bestBlob = blob;
      }

      if (blob.size <= targetBytes) {
        return URL.createObjectURL(blob);
      }
    }

    maxDimension = Math.floor(maxDimension * 0.82);
  }

  return URL.createObjectURL(bestBlob ?? file);
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load image for compression.'));
    };
    image.src = objectUrl;
  });
}

function drawScaledImage(image: HTMLImageElement, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not create image compression canvas.');
  }

  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not encode compressed image.'));
          return;
        }

        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}
