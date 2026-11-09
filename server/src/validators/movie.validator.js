const validateMovieInput = (data, isUpdate = false) => {    //isUpdate = false tức là khi mà gọi hàm mà không truyền isUpdate thì nó mặc định là false
    const errors = [];
    const { title, description, genres, duration, releaseDate, status, posterURL, trailerYoutubeId, } = data;

    if (!isUpdate || title !== undefined) { //kiểm tra xem nếu mà đang tạo mới hoặc người dùng có gửi title lên khi cập nhật thì mới bắt đầu kiểm tra các điều kiện ở dưới
        if (!title || typeof title !== 'string' || title.trim() == '') { //title.trim() phòng trường hợp người dùng nhập toàn khoảng trắng nhưng vẫn nhận là title
            errors.push('Tên phim không được bỏ trống!'); //đẩy thông báo lỗi vào cuối mảng
        }
    }
    if (!isUpdate || genres !== undefined) {
        if (!Array.isArray(genres) || genres.length === 0) {
            errors.push('Phim phải có ít nhất một thể loại!'); //đẩy thông báo lỗi vào cuối mảng
        }
    }
    if (!isUpdate || duration !== undefined) {
        if (typeof duration !== 'number' || duration <= 10) {
            errors.push('Phim phải có thời lượng phim!'); //đẩy thông báo lỗi vào cuối mảng
        } else if (duration === undefined) {
            errors.push('Thời lượng phim không được để trống!')
        }
    }
    if (!isUpdate || releaseDate !== undefined) {
        if (!releaseDate || isNaN(Date.parse(releaseDate))) {
            errors.push('Ngày khởi chiếu không đúng định dạng!');
        }
    }

    if (!isUpdate || status !== undefined) {
        if (!['now_showing', 'coming_soon'].includes(status)) {
            errors.push("Trạng thái phim phải là 'now_showing' hoặc 'coming_soon'!");
        }
    }

    if (!isUpdate || posterURL !== undefined) {
        if (!posterURL || typeof posterURL !== 'string' || posterURL.trim() === '') {
            errors.push('Đường dẫn poster không được để trống!');
        }
    }

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