const Movie = require('../models/Movie');
const { validateMovieInput } = require('../validators/movie.validator');

const getMovies = async (req, res, next) => {
    try {
        const { q, genre, status, page = 1, limit = 8 } = req.query; //req.query lấy các thành phần phái sau dấu hỏi trên URL
        const query = {};
        if (q && q.trim() !== '') {
            query.title = { $regex: q.trim(), $options: 'i' }; //$regex tìm chuỗi chứa từ khóa, &option tìm mà không phân biệt hoa hay thường
        }
        if (genre && genre.trim() !== '') {
            query.genres = { $in: [genre.trim()] }; //$in tìm kiếm có trong mảng genre
        }
        if (status && status.trim() !== '') {
            query.status = status.trim();
        }

        const currentPage = Math.max(1, parseInt(page, 10) || 1); //mặc định trang đưa về 1 nếu người dùng nhập 0 và số âm hay abc xyz
        const limitPerPage = Math.max(1, parseInt(limit, 10) || 8); //tương tự cái trên nhưng cho giới hạn phim/trang
        const skip = (currentPage - 1) * limitPerPage; //khi lấy phim từ csdl nesu trang 1 đầy 8 phim thì trang 2 láy từ phim thứ 9-16 cứ vậy cho đến hết

        const [movies, total] = await Promise.all([ //chạy cùng lúc 2 truy vấn để tiết kiệm thời gian
            Movie.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitPerPage),
            Movie.countDocuments(query),
        ]);

        return res.status(200).json({
            data: movies,
            total,
            page: currentPage,
            pages: Math.ceil(total / limitPerPage) || 1,
        });
    } catch (error) {
        next(error);
    }
};

const getMovieById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const movie = await Movie.findById(id);

        if (!movie) {
            return res.status(404).json({ message: "Không tìm thấy phim với tên này!" })
        }

        return res.status(200).json({ data: movie });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Định dạng ID phim không hợp lệ!' });
        }
        next(error);
    }
};

const createMovie = async (req, res, next) => {
    try {
        const { isValid, errors } = validateMovieInput(req.body, false);
        if (!isValid) {
            return res.status(400).json({ message: 'Dữ liệu đầu vào không hợp lệ!', errors });
        }

        const newMovie = await Movie.create(req.body);
        return res.status(201).json({ message: 'Tạo phim mới thành công.', data: newMovie });
    } catch (error) {
        next(error);
    }
};

const updateMovie = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate dữ liệu với isUpdate = true (chỉ kiểm tra các trường được gửi lên)
        const { isValid, errors } = validateMovieInput(req.body, true);
        if (!isValid) {
            return res.status(400).json({ message: 'Dữ liệu cập nhật không hợp lệ!', errors });
        }

        // tìm và cập nhật phim trong database
        const updatedMovie = await Movie.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!updatedMovie) {
            return res.status(404).json({ message: 'Không tìm thấy phim để cập nhật!' });
        }

        return res.status(200).json({ message: 'Cập nhật phim thành công.', data: updatedMovie });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Định dạng ID phim không hợp lệ!' });
        }
        next(error);
    }
};

const deleteMovie = async (req, res, next) => {
    try {
        const { id } = req.params;

        // tìm và xóa bộ phim theo ID
        const deletedMovie = await Movie.findByIdAndDelete(id);

        if (!deletedMovie) {
            return res.status(404).json({ message: 'Không tìm thấy phim để xóa!' });
        }

        return res.status(200).json({ message: 'Xóa phim thành công.', data: { id } });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Định dạng ID phim không hợp lệ!' });
        }
        next(error);
    }
};

module.exports = {
    getMovies,
    getMovieById,
    createMovie,
    updateMovie,
    deleteMovie,
};
