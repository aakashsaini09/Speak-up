const multer = require('multer');
const storage = multer.memoryStorage();
const imageFileFilter = (req, file, cb) => {
	const allowedTypes = /jpeg|jpg|png|webp|gif/;
	const mimeOk = allowedTypes.test(file.mimetype);
	const extOk = allowedTypes.test(file.originalname.toLowerCase());
	if (mimeOk && extOk) {
		return cb(null, true);
	}
	return cb(new Error('Only image files are allowed.'), false);
};
const upload = multer({
	storage,
	fileFilter: imageFileFilter,
	limits: {
		fileSize: 10 * 1024 * 1024,
	},
});
module.exports = upload;