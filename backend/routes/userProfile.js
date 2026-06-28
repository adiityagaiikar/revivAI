const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

function normalizeOptionalNumber(value, fieldName, { min = 0, max = Infinity } = {}) {
  if (value === undefined) {
    return { provided: false };
  }

  if (value === null || value === '') {
    return { provided: true, value: null };
  }

  const num = Number(value);
  if (!Number.isFinite(num)) {
    return { error: `${fieldName} must be a valid number.` };
  }

  if (num < min || num > max) {
    return { error: `${fieldName} must be between ${min} and ${max}.` };
  }

  return { provided: true, value: num };
}

// GET /api/user/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select('age weight height');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      age: user.age ?? null,
      weight: user.weight ?? null,
      height: user.height ?? null,
    });
  } catch (error) {
    console.error('Get demographics profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/user/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const ageInput = normalizeOptionalNumber(req.body.age, 'age', { min: 0, max: 130 });
    if (ageInput.error) return res.status(400).json({ message: ageInput.error });

    const weightInput = normalizeOptionalNumber(req.body.weight, 'weight', { min: 0, max: 1000 });
    if (weightInput.error) return res.status(400).json({ message: weightInput.error });

    const heightInput = normalizeOptionalNumber(req.body.height, 'height', { min: 0, max: 300 });
    if (heightInput.error) return res.status(400).json({ message: heightInput.error });

    const updates = {};
    if (ageInput.provided) updates.age = ageInput.value;
    if (weightInput.provided) updates.weight = weightInput.value;
    if (heightInput.provided) updates.height = heightInput.value;

    const user = await User.findByIdAndUpdate(
      req.user,
      { $set: updates },
      { new: true, runValidators: true, select: 'age weight height' }
    );

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      message: 'Profile updated successfully',
      profile: {
        age: user.age ?? null,
        weight: user.weight ?? null,
        height: user.height ?? null,
      },
    });
  } catch (error) {
    console.error('Update demographics profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
