import multer, { MulterError } from 'multer';
import { Request, Response, NextFunction } from 'express';

const upload = multer();

const uploadMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction,
): void => {
	// Use the multer upload middleware
	upload.single('file')(req, res, function (err) {
		if (err instanceof MulterError) {
			// A Multer error occurred while uploading
			return res.status(500).json({ error: 'File upload error' });
		} else if (err) {
			// An unknown error occurred while uploading
			return res
				.status(500)
				.json({ error: err.message || 'Unknown error' });
		}

		// File was uploaded successfully
		next();
	});
};

export default uploadMiddleware;
