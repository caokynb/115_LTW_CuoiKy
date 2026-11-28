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
            },
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
        ageRating: {
            type: String,
            enum: {
                values: ['P', 'K', 'T13', 'T16', 'T18', 'C'],
                message: 'Nhãn độ tuổi chỉ chấp nhận P, K, T13, T16, T18 hoặc C',
            },
            default: 'P',
            index: true,
        },
        posterUrl: {
            type: String,
            required: [true, 'URL ảnh poster là bắt buộc'],
            trim: true,
            alias: 'posterURL',
        },
        // danh sách các URL poster phụ từ TMDB để luân phiên hiển thị trên thẻ phim
        posterUrls: {
            type: [String],
            default: [],
        },
        // URL ảnh nền ngang (16:9 backdrop) hiển thị cho banner trang chủ và chi tiết phim
        backdropUrl: {
            type: String,
            default: '',
            trim: true,
        },
        tmdbId: {
            type: Number,
            default: null,
        },
        trailerYoutubeId: {
            type: String,
            required: [true, 'YouTube ID của trailer là bắt buộc'],
            trim: true,
        },
        formats: { type: [String], enum: ['2D', '3D', 'IMAX'], default: ['2D'], validate: (values) => values.length > 0 },
        audioOptions: { type: [String], enum: ['subtitled', 'dubbed'], default: ['subtitled'], validate: (values) => values.length > 0 },
        averageRating: { type: Number, default: 0, min: 0, max: 5 },
        reviewCount: { type: Number, default: 0, min: 0 },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Movie', movieSchema);
