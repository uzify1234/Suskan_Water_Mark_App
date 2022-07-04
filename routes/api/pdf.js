const express = require('express');
const router = express.Router();
const pdftk = require('node-pdftk');
const PDFDocument = require('pdfkit');
const uuid = require('uuid');
const fs = require('fs');
const downloadAndSave = require('../../utils/downloadAndSave');

const MAX_HEIGHT = 50;
const MAX_WIDTH = 50;
const PADDING = 10;

const getWaterMarkStart = (position, pageHeight, pageWidth) => {
	const wmCord = {
		x: PADDING,
		y: PADDING,
	};

	if (position == 'TL') {
		wmCord.x = PADDING;
		wmCord.y = PADDING;
	} else if (position == 'TR') {
		wmCord.x = pageWidth - MAX_WIDTH - PADDING;
		wmCord.y = PADDING;
	} else if (position == 'BL') {
		wmCord.x = PADDING;
		wmCord.y = pageHeight - MAX_HEIGHT - 50;
	} else if (position == 'BR') {
		wmCord.x = pageWidth - MAX_WIDTH - PADDING;
		wmCord.y = pageHeight - MAX_HEIGHT - 50;
	}

	return wmCord;
};

// @route       POST api/v1/watermark-pdf
// @desc        Send watermarked pdf
// @access      Public
router.post('/', async (req, res) => {
	const { imageUrl, pdfUrl, waterMarkText, wmPosition } = req.body;

	if (!imageUrl || !pdfUrl || !waterMarkText || !wmPosition) {
		return res.status(400).send({ message: 'BAD REQUEST' });
	}
	const id = uuid.v4();

	const downloadedImageFile = await downloadAndSave(id, imageUrl);
	if (!fs.existsSync(downloadedImageFile)) {
		return res.status(500).send({ message: 'Bad Link' });
	}

	const downloadedPdfFile = await downloadAndSave(id, pdfUrl);
	if (!fs.existsSync(downloadedPdfFile)) {
		fs.unlink(downloadedImageFile, (err) => {
			if (err) console.log(err);
			console.log('Downloaded image deleted');
		});
		return res.status(500).send({ message: 'Bad Link' });
	}

	try {
		const waterMarkedImageFile = `./tmp/downloads/${id}-wm.pdf`;

		const doc = new PDFDocument({ compress: false });
		const wmCord = getWaterMarkStart(
			wmPosition,
			doc.page.height,
			doc.page.width
		);
		const writeStream = fs.createWriteStream(waterMarkedImageFile);
		doc.image(downloadedImageFile, wmCord.x, wmCord.y, {
			fit: [MAX_WIDTH, MAX_HEIGHT],
			align: 'right',
			valign: 'center',
		});
		doc.page.margins.bottom = 0;
		doc.rect(0, doc.page.height - 30, doc.page.width, 30).fillAndStroke(
			'#fff',
			'#fff'
		);
		doc.fill('#000').stroke();
		doc.fontSize(16).text(waterMarkText, 50, doc.page.height - 20, {
			align: 'center',
		});
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

					// fs.unlink(waterMarkedImageFile, (err) => {
					// 	if (err) console.log(err.message);
					// });
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
		res.status(500).send({ message: 'Internal Server Error' });
	}
});

module.exports = router;
