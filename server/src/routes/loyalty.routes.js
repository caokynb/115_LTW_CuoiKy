const express = require('express');
const { getMyLoyalty } = require('../controllers/loyalty.controller');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);
router.get('/me', getMyLoyalty);

module.exports = router;
