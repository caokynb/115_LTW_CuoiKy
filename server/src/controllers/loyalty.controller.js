const mongoose = require('mongoose');
const User = require('../models/User');
const RewardPoint = require('../models/RewardPoint');

const calculateTier = (points) => {
  const p = Number(points) || 0;
  if (p >= 200000) {
    return {
      name: 'Kim Cương (Diamond)',
      level: 3,
      discountRate: '10%',
      nextTier: null,
      pointsToNext: 0,
    };
  }
  if (p >= 50000) {
    return {
      name: 'Vàng (Gold)',
      level: 2,
      discountRate: '7%',
      nextTier: 'Kim Cương (Diamond)',
      pointsToNext: 200000 - p,
    };
  }
  return {
    name: 'Bạc (Silver)',
    level: 1,
    discountRate: '5%',
    nextTier: 'Vàng (Gold)',
    pointsToNext: 50000 - p,
  };
};

/**
 * Lấy thông tin điểm thưởng, hạng thành viên và lịch sử biến động điểm
 * GET /api/loyalty/me
 */
const getMyLoyalty = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('fullName email phone rewardPoints');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng',
      });
    }

    const points = user.rewardPoints || 0;
    const tierInfo = calculateTier(points);

    const history = await RewardPoint.find({ userId: req.user._id })
      .populate('bookingId', 'totalPrice createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      data: {
        points,
        tier: tierInfo.name,
        tierInfo,
        earnRate: '5%',
        history,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyLoyalty,
  calculateTier,
};
