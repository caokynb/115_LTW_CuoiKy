const express = require('express');
const { body, validationResult } = require('express-validator');
const { verifyToken, requireRole } = require('../middleware/auth');
const AppError = require('../utils/AppError');
const {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
} = require('../controllers/room.controller');

const router = express.Router();

const roomValidationRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Tên phòng là bắt buộc'),
  body('rows')
    .isInt({ min: 5, max: 50 })
    .withMessage('Số hàng phải từ 5 đến 50')
    .toInt(),
  body('seatsPerRow')
    .isInt({ min: 5, max: 50 })
    .withMessage('Số ghế mỗi hàng phải từ 5 đến 50')
    .toInt(),
  body('vipRows')
    .optional()
    .custom((value, { req }) => {
      if (!Array.isArray(value)) {
        throw new Error('Danh sách hàng VIP phải là một mảng');
      }

      const vipRows = value.map((row) => {
        if (typeof row === 'number') return row;
        if (typeof row === 'string' && /^\d+$/.test(row.trim())) {
          return Number(row);
        }
        return Number.NaN;
      });
      if (!vipRows.every(Number.isInteger)) {
        throw new Error('Các hàng VIP phải là số nguyên');
      }

      if (new Set(vipRows).size !== vipRows.length) {
        throw new Error('Hàng VIP không được trùng nhau');
      }

      const totalRows = Number(req.body.rows);
      if (vipRows.some((row) => row < 1 || row > totalRows)) {
        throw new Error('Hàng VIP phải nằm trong phạm vi hàng ghế của phòng');
      }

      req.body.vipRows = vipRows;
      return true;
    }),
];

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((error) => error.msg)
      .join('. ');
    return next(new AppError(message, 400));
  }

  if (req.body.vipRows === undefined) {
    req.body.vipRows = [];
  }

  return next();
};

router.use(verifyToken, requireRole('admin'));

router
  .route('/')
  .post(roomValidationRules, validateRequest, createRoom)
  .get(getAllRooms);

router
  .route('/:id')
  .get(getRoomById)
  .put(roomValidationRules, validateRequest, updateRoom)
  .delete(deleteRoom);

module.exports = router;
