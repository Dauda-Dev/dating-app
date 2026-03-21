const db = require('../config/database');
const { formatUserResponse, calculateAge, createError } = require('../utils/helpers');
const { deleteFile } = require('../config/cloudinary');

module.exports = {
  async getProfile(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const user = await db.User.findByPk(userId, {
        include: [{
          model: db.Profile,
          as: 'profile'
        }]
      });

      if (!user) throw createError('User not found', 404);

      return res.json({
        user: formatUserResponse(user),
        profile: user.profile || null,
        age: calculateAge(user.dateOfBirth)
      });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const {
        bio,
        location,
        interests,
        hobbies,
        preferredGender,
        lookingFor,
        ageRangeMin,
        ageRangeMax,
        height,
        bodyType,
        education,
        occupation,
        zodiacSign,
        personalityTraits,
        photos
      } = req.body;

      let profile = await db.Profile.findOne({ where: { userId } });
      if (!profile) {
        profile = await db.Profile.create({ userId });
      }

      const updateData = {};
      if (bio !== undefined) updateData.bio = bio;
      if (location !== undefined) updateData.location = location;
      if (interests !== undefined) updateData.interests = interests;
      if (hobbies !== undefined) updateData.hobbies = hobbies;
      if (preferredGender !== undefined) updateData.preferredGender = preferredGender;
      if (lookingFor !== undefined) updateData.lookingFor = lookingFor;
      if (ageRangeMin !== undefined || ageRangeMax !== undefined) {
        updateData.ageRange = { min: ageRangeMin || 18, max: ageRangeMax || 50 };
      }
      if (education !== undefined) updateData.education = education;
      if (occupation !== undefined) updateData.occupation = occupation;
      if (zodiacSign !== undefined) updateData.zodiacSign = zodiacSign;
      if (personalityTraits !== undefined) updateData.personalityTraits = personalityTraits;
      if (photos !== undefined) updateData.photos = photos;

      await profile.update(updateData);

      return res.json({ success: true, profile });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Upload profile photo via Cloudinary (multipart/form-data, field: "photo")
   * multer middleware must run before this handler — see users route
   */
  async updateProfilePicture(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;

      if (!req.file) {
        throw createError('No image file provided. Send as multipart/form-data with field "photo"', 400);
      }

      const user = await db.User.findByPk(userId);
      if (!user) throw createError('User not found', 404);

      // Delete old photo from Cloudinary if it exists
      if (user.profilePhoto) {
        await deleteFile(user.profilePhoto);
      }

      // req.file.path is the Cloudinary secure_url when using multer-storage-cloudinary
      const photoUrl = req.file.path;

      await user.update({ profilePhoto: photoUrl });

      return res.json({
        success: true,
        profilePhoto: photoUrl,
        user: formatUserResponse(user)
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Upload a gallery photo (multipart/form-data, field: "photo")
   */
  async uploadGalleryPhoto(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;

      if (!req.file) {
        throw createError('No image file provided', 400);
      }

      const photoUrl = req.file.path;

      let profile = await db.Profile.findOne({ where: { userId } });
      if (!profile) {
        profile = await db.Profile.create({ userId });
      }

      const currentPhotos = profile.photos || [];
      if (currentPhotos.length >= 9) {
        throw createError('Maximum 9 gallery photos allowed', 400);
      }

      await profile.update({ photos: [...currentPhotos, photoUrl] });

      return res.json({ success: true, photoUrl, photos: [...currentPhotos, photoUrl] });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete a gallery photo by URL
   */
  async deleteGalleryPhoto(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const { photoUrl } = req.body;

      if (!photoUrl) throw createError('photoUrl is required', 400);

      const profile = await db.Profile.findOne({ where: { userId } });
      if (!profile) throw createError('Profile not found', 404);

      const photos = (profile.photos || []).filter(p => p !== photoUrl);
      await profile.update({ photos });

      await deleteFile(photoUrl);

      return res.json({ success: true, photos });
    } catch (err) {
      next(err);
    }
  },

  async updateLastActive(req, res, next) {
    try {
      const userId = req.userId || req.user?.userId;
      const user = await db.User.findByPk(userId);
      if (!user) throw createError('User not found', 404);
      await user.update({ updatedAt: new Date() });
      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await db.User.findByPk(id, {
        attributes: ['id', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'profilePhoto'],
        include: [{
          model: db.Profile,
          as: 'profile',
          attributes: ['bio', 'location', 'interests', 'hobbies', 'photos', 'occupation']
        }]
      });

      if (!user) throw createError('User not found', 404);

      return res.json({
        user,
        age: calculateAge(user.dateOfBirth)
      });
    } catch (err) {
      next(err);
    }
  },

  async searchUsers(req, res, next) {
    try {
      const { query, limit = 10 } = req.query;

      if (!query || query.length < 2) {
        throw createError('Search query must be at least 2 characters', 400);
      }

      const users = await db.User.findAll({
        where: {
          [db.Sequelize.Op.or]: [
            db.sequelize.where(
              db.sequelize.fn('concat', db.sequelize.col('first_name'), ' ', db.sequelize.col('last_name')),
              { [db.Sequelize.Op.iLike]: `%${query}%` }
            ),
          ]
        },
        attributes: ['id', 'firstName', 'lastName', 'gender', 'profilePhoto'],
        limit: parseInt(limit, 10),
      });

      return res.json({ users });
    } catch (err) {
      next(err);
    }
  }
};
