const express = require('express');
const router = express.Router();
const pdftk = require('node-pdftk');
const PDFDocument = require('pdfkit');
const uuid = require('uuid');
const fs = require('fs');
const downloadAndSave = require('../../utils/downloadAndSave');

// @route       GET api/v1/watermark-pdf
// @desc        Send watermarked pdf
// @access      Public
router.get('/', async (req, res) => {
	const imageUri = req.query.imageUri;
	const pdfUri = req.query.pdfUri;
	const id = uuid.v4();

	downloadAndSave(id, imageUri).then((imageFile) => {
		const downloadedImageFile = `./tmp/downloads/${imageFile}`;
		downloadAndSave(id, pdfUri).then((pdfFile) => {
			const downloadedPdfFile = `./tmp/downloads/${pdfFile}`;
			const waterMarkedImageFile = `./tmp/downloads/${id}-wm.pdf`;
			try {
				const doc = new PDFDocument({ compress: false });
				const writeStream = fs.createWriteStream(waterMarkedImageFile);
				doc.image(downloadedImageFile, 10, 0, { width: 50 });
				doc.pipe(writeStream);
				doc.end();
				writeStream.on('finish', () => {
					fs.unlink(downloadedImageFile, (err) => {
						if (err) console.log(err);
						console.log('Downloaded image deleted');
					});

					pdftk
						.input(downloadedPdfFile)
						.stamp(waterMarkedImageFile)
						.output()
						.then((buffer) => {
							res.type('application/pdf');
							res.send(buffer);

							fs.unlink(downloadedPdfFile, (err) => {
								if (err) console.log(err.message);
							});

							fs.unlink(waterMarkedImageFile, (err) => {
								if (err) console.log(err.message);
							});
						})
						.catch((err) => {
							fs.unlink(downloadedPdfFile, (err) => {
								if (err) console.log(err.message);
							});

							fs.unlink(waterMarkedImageFile, (err) => {
								if (err) console.log(err.message);
							});
							console.log(err);
							res.send('Failed');
						});
				});
			} catch (err) {
				fs.unlink(downloadedImageFile, (err) => {
					if (err) console.log(err);
					console.log('Downloaded image deleted');
				});
				fs.unlink(downloadedPdfFile, (err) => {
					if (err) console.log(err.message);
				});

				fs.unlink(waterMarkedImageFile, (err) => {
					if (err) console.log(err.message);
				});
				console.log('MakePDF ERROR ' + err.message);
				res.send('Failed');
			}
		});
	});
});

module.exports = router;
