const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Profile photo storage ─────────────────────────────────────────────────────
const profilePhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'dating-app/profile-photos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    moderation: 'webpurify',
    transformation: [
      { width: 800, height: 800, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  },
});

// ── Gallery photo storage ─────────────────────────────────────────────────────
const galleryPhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'dating-app/gallery',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    moderation: 'webpurify',
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  },
});

const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  limits: { fileSize: FILE_SIZE_LIMIT },
  fileFilter,
});

const uploadGalleryPhoto = multer({
  storage: galleryPhotoStorage,
  limits: { fileSize: FILE_SIZE_LIMIT },
  fileFilter,
});

/**
 * Delete a file from Cloudinary by its public_id or full URL
 */
const deleteFile = async (publicIdOrUrl) => {
  if (!publicIdOrUrl) return;
  try {
    // If it's a full URL, extract the public_id
    let publicId = publicIdOrUrl;
    if (publicIdOrUrl.startsWith('http')) {
      // e.g. https://res.cloudinary.com/<cloud>/image/upload/v123/dating-app/profile-photos/abc.jpg
      const match = publicIdOrUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
      if (match) publicId = match[1];
    }
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }
};

module.exports = { cloudinary, uploadProfilePhoto, uploadGalleryPhoto, deleteFile };
