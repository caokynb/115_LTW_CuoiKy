const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Tên phim không được để trống.'],
            trim: true,
            index: true,
        },
        description: {
            type: String,
            required: [true, 'Mô tả phim không được để trống.'],
            trim: true,
        },
        genres: {
            type: [String],
            required: [true, 'Thể loại không được để trống.'],
            validate: {
                validator: (v) => Array.isArray(v) && v.length > 0,
                message: 'Phim phải có ít nhất một thể loại',
            }
        },
        duration: {
            type: Number,
            required: [true, 'Thời lượng phim là bắt buộc'],
            min: [1, 'Thời lượng phim phải lớn hơn 0 phút'],
        },
        releaseDate: {
            type: Date,
            required: [true, 'Ngày khởi chiếu là bắt buộc'],
        },
        status: {
            type: String,
            enum: {
                values: ['now_showing', 'coming_soon'],
                message: 'Trạng thái chỉ chấp nhận now_showing hoặc coming_soon',
            },
            default: 'coming_soon',
            index: true,
        },
        posterUrl: {
            type: String,
            required: [true, 'URL ảnh poster là bắt buộc'],
            trim: true,
        },
        trailerYoutubeId: {
            type: String,
            required: [true, 'YouTube ID của trailer là bắt buộc'],
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Movie', movieSchema);