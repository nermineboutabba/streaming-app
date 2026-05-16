const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');


// STORAGE CONFIGURATION
const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, 'src/uploads/');
    },

    filename: (req, file, cb) => {

        const uniqueName =
            uuidv4() + path.extname(file.originalname);

        cb(null, uniqueName);
    }
});


// FILE FILTER
const fileFilter = (req, file, cb) => {

    const allowedTypes = ['.mp4', '.mov', '.avi'];

    const extension = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(extension)) {
        cb(null, true);
    } else {
        cb(new Error('Only video files are allowed'), false);
    }
};


const upload = multer({
    storage,
    fileFilter
});

module.exports = upload;