/**
 * Hàm kiểm tra dữ liệu đầu vào của Phim (Movie)
 * @param {Object} data - Dữ liệu phim gửi từ client
 * @param {Boolean} isUpdate - false: kiểm tra khi tạo mới (bắt buộc các trường chính); true: kiểm tra khi cập nhật (chỉ kiểm tra các trường gửi lên)
 * @returns {Object} { isValid: Boolean, errors: Array<String> }
 */
const validateMovieInput = (data, isUpdate = false) => {
    const errors = [];
    const {
        title,
        description,
        genres,
        duration,
        releaseDate,
        status,
        trailerYoutubeId,
    } = data;

    // Hỗ trợ cả 2 cách đặt tên: posterUrl hoặc posterURL
    const poster = data.posterUrl !== undefined ? data.posterUrl : data.posterURL;

    // Khi cập nhật (PUT), bắt buộc phải có ít nhất 1 trường được gửi lên
    if (isUpdate && (!data || Object.keys(data).length === 0)) {
        errors.push('Vui lòng cung cấp ít nhất một trường dữ liệu để cập nhật!');
        return { isValid: false, errors };
    }

    // 1. Kiểm tra Tên phim (title)
    if (!isUpdate || title !== undefined) {
        if (!title || typeof title !== 'string' || title.trim() === '') {
            errors.push('Tên phim không được để trống!');
        }
    }

    // 2. Kiểm tra Mô tả phim (description)
    if (!isUpdate || description !== undefined) {
        if (!description || typeof description !== 'string' || description.trim() === '') {
            errors.push('Mô tả phim không được để trống!');
        }
    }

    // 3. Kiểm tra Thể loại (genres)
    if (!isUpdate || genres !== undefined) {
        if (!Array.isArray(genres) || genres.length === 0) {
            errors.push('Phim phải có ít nhất một thể loại!');
        } else if (genres.some((g) => typeof g !== 'string' || g.trim() === '')) {
            errors.push('Tên mỗi thể loại phải là chuỗi hợp lệ và không được để trống!');
        }
    }

    // 4. Kiểm tra Thời lượng (duration)
    if (!isUpdate || duration !== undefined) {
        if (duration === undefined || duration === null) {
            errors.push('Thời lượng phim không được để trống!');
        } else if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
            errors.push('Thời lượng phim phải là số lớn hơn 0 phút!');
        }
    }

    // 5. Kiểm tra Ngày khởi chiếu (releaseDate)
    if (!isUpdate || releaseDate !== undefined) {
        if (!releaseDate || isNaN(Date.parse(releaseDate))) {
            errors.push('Ngày khởi chiếu không đúng định dạng ngày tháng hợp lệ!');
        }
    }

    // 6. Kiểm tra Trạng thái (status)
    // Lưu ý: Khi tạo mới nếu không truyền status thì Schema tự gán mặc định 'coming_soon', nên chỉ kiểm tra khi status được truyền vào
    if (status !== undefined) {
        if (!['now_showing', 'coming_soon'].includes(status)) {
            errors.push("Trạng thái phim chỉ chấp nhận 'now_showing' hoặc 'coming_soon'!");
        }
    }

    // 7. Kiểm tra Poster (posterUrl / posterURL)
    if (!isUpdate || poster !== undefined) {
        if (!poster || typeof poster !== 'string' || poster.trim() === '') {
            errors.push('URL ảnh poster không được để trống!');
        }
    }

    // 8. Kiểm tra Trailer YouTube ID (trailerYoutubeId)
    if (!isUpdate || trailerYoutubeId !== undefined) {
        if (!trailerYoutubeId || typeof trailerYoutubeId !== 'string' || trailerYoutubeId.trim() === '') {
            errors.push('YouTube Trailer ID không được để trống!');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

module.exports = { validateMovieInput };
