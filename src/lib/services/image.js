// Decodes an uploaded image file into a data URL that pdf-lib can embed.
// pdf-lib only supports PNG and JPEG, so anything else (e.g. WebP) is
// re-encoded to PNG via a canvas at the original dimensions.

export function readImageFile(file) {
	return new Promise((resolve, reject) => {
		if (!file || !file.type || !file.type.startsWith('image/')) {
			reject(new Error('That file is not an image.'));
			return;
		}
		const reader = new FileReader();
		reader.onerror = () => reject(new Error('Could not read that file.'));
		reader.onload = () => {
			const src = String(reader.result || '');
			const img = new Image();
			img.onerror = () => reject(new Error('Could not decode that image.'));
			img.onload = () => {
				const width = img.naturalWidth || 0;
				const height = img.naturalHeight || 0;
				const embeddable = file.type === 'image/png' || file.type === 'image/jpeg';
				if (embeddable || !width || !height) {
					resolve({ dataUrl: src, width, height });
					return;
				}
				try {
					const canvas = document.createElement('canvas');
					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext('2d');
					if (!ctx) throw new Error('Canvas unavailable.');
					ctx.drawImage(img, 0, 0, width, height);
					resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
				} catch {
					resolve({ dataUrl: src, width, height });
				}
			};
			img.src = src;
		};
		reader.readAsDataURL(file);
	});
}
