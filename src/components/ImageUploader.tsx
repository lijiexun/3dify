import { useState, type ChangeEvent, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { compressImageFile } from '../utils/compressImage';

type DemoImage = {
  label: string;
  url: string;
};

type ImageUploaderProps = {
  demos: DemoImage[];
  onImageSelected: (imageUrl: string) => void;
};

const acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'];

function ImageUploader({ demos, onImageSelected }: ImageUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [urlStatus, setUrlStatus] = useState('');
  const [isCheckingUrl, setIsCheckingUrl] = useState(false);

  const closeDialog = () => {
    setIsOpen(false);
    setImageUrl('');
    setUrlStatus('');
    setIsCheckingUrl(false);
  };

  const selectImage = (url: string) => {
    onImageSelected(url);
    closeDialog();
  };

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !acceptedFormats.includes(file.type)) {
      setUrlStatus('Choose a JPG, PNG, or WebP image.');
      return;
    }

    const compressedUrl = await compressImageFile(file);
    selectImage(compressedUrl);
    event.target.value = '';
  }

  async function handleUrlSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedUrl = imageUrl.trim();

    if (!trimmedUrl) {
      setUrlStatus('Paste an image URL first.');
      return;
    }

    if (!isLikelyUrl(trimmedUrl)) {
      setUrlStatus('Enter a valid http or https URL.');
      return;
    }

    setIsCheckingUrl(true);
    setUrlStatus('Checking image...');

    const imageCheck = await checkImageUrl(trimmedUrl);
    setIsCheckingUrl(false);

    if (imageCheck === 'blocked-by-cors') {
      setUrlStatus('This is an image, but its server blocks WebGL use. Download it and upload the file instead.');
      return;
    }

    if (imageCheck === 'not-image') {
      setUrlStatus('This image could not be loaded. Try a direct JPG, PNG, or WebP URL.');
      return;
    }

    selectImage(trimmedUrl);
  }

  return (
    <>
      <button className="upload-button" type="button" onClick={() => setIsOpen(true)}>
        Upload
      </button>

      {isOpen && createPortal(
        <div className="upload-modal-backdrop" role="presentation" onMouseDown={closeDialog}>
          <section
            className="upload-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="upload-modal-header">
              <div>
                <h2 id="upload-dialog-title">Open a photo</h2>
                <p>Choose a demo, upload an image, or paste an image URL.</p>
              </div>
              <button className="icon-button" type="button" aria-label="Close upload dialog" onClick={closeDialog}>
                x
              </button>
            </div>

            <div className="upload-modal-section">
              <span className="upload-section-label">Demos</span>
              <div className="demo-grid">
                {demos.map((demo) => (
                  <button
                    className="demo-card"
                    type="button"
                    key={demo.url}
                    onMouseDown={() => selectImage(demo.url)}
                    onClick={() => selectImage(demo.url)}
                  >
                    <img src={demo.url} alt="" aria-hidden="true" />
                    <span>{demo.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="upload-modal-section">
              <span className="upload-section-label">Upload</span>
              <label className="file-drop">
                <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleUpload} />
                <span>Choose image</span>
              </label>
            </div>

            <form className="upload-modal-section url-form" noValidate onSubmit={handleUrlSubmit}>
              <label className="upload-section-label" htmlFor="image-url">
                Image URL
              </label>
              <div className="url-row">
                <input
                  id="image-url"
                  type="url"
                  value={imageUrl}
                  placeholder="https://example.com/photo.jpg"
                  onChange={(event) => {
                    setImageUrl(event.target.value);
                    setUrlStatus('');
                  }}
                />
                <button className="button subtle" type="submit" disabled={isCheckingUrl}>
                  {isCheckingUrl ? 'Checking' : 'Use URL'}
                </button>
              </div>
              {urlStatus && <p className="url-status">{urlStatus}</p>}
            </form>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

function isLikelyUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

type ImageUrlCheck = 'usable' | 'blocked-by-cors' | 'not-image';

async function checkImageUrl(url: string): Promise<ImageUrlCheck> {
  const corsImageLoads = await canLoadImage(url, true);

  if (corsImageLoads) {
    return 'usable';
  }

  const plainImageLoads = await canLoadImage(url, false);
  return plainImageLoads ? 'blocked-by-cors' : 'not-image';
}

function canLoadImage(url: string, useCors: boolean) {
  return new Promise<boolean>((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => resolve(false), 8000);

    if (useCors) {
      image.crossOrigin = 'anonymous';
    }

    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(Boolean(image.naturalWidth && image.naturalHeight));
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      resolve(false);
    };
    image.src = url;
  });
}

export default ImageUploader;
