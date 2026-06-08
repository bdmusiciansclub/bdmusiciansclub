const CLOUDINARY_CLOUD = 'dxs4aodwr';
const CLOUDINARY_PRESET = 'bmc_uploads';

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) throw new Error('Upload failed');
  const data = await response.json();
  return data.secure_url;
}

export { uploadToCloudinary };
