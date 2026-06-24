import type { ChangeEvent } from 'react';
import { compressImageFile } from '../utils/compressImage';

type ImageUploaderProps = {
  onImageSelected: (imageUrl: string) => void;
};

const acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'];

function ImageUploader({ onImageSelected }: ImageUploaderProps) {
  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !acceptedFormats.includes(file.type)) {
      return;
    }

    const compressedUrl = await compressImageFile(file);
    onImageSelected(compressedUrl);
    event.target.value = '';
  }

  return (
    <label className="upload-button">
      <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleUpload} />
      <span>Upload</span>
    </label>
  );
}

export default ImageUploader;
