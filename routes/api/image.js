const express = require('express');
const router = express.Router();
const Jimp = require('jimp');
const uuid = require('uuid');
const fs = require('fs');
const downloadAndSave = require('../../utils/downloadAndSave');

const LOGO_MARGIN_PERCENTAGE = 5;
const heightForText = 50;

const getWaterMarkStart = (
	position,
	imageHeight,
	imageWidth,
	logoHeight,
	logoWidth,
	xMargin,
	yMargin
) => {
	let X = xMargin;
	let Y = yMargin;

	if (position == 'TL') {
		X = xMargin;
		Y = yMargin;
	} else if (position == 'TR') {
		X = imageWidth - logoWidth - xMargin;
		Y = yMargin;
	} else if (position == 'BL') {
		X = xMargin;
		Y = imageHeight - logoHeight - yMargin - heightForText;
	} else if (position == 'BR') {
		X = imageWidth - logoWidth - xMargin;
		Y = imageHeight - logoHeight - yMargin - heightForText;
	}

	return { X, Y };
};

// @route       POST api/v1/watermark-image
// @desc        Send watermarked image
// @access      Public
router.post('/', async (req, res) => {
	const { imageUrl, wmImageUrl, waterMarkText, wmPosition } = req.body;

	if (!imageUrl || !wmImageUrl || !waterMarkText || !wmPosition) {
		return res.status(400).send({ message: 'BAD REQUEST' });
	}
	const id = uuid.v4();

	const originalImage = await downloadAndSave(id, imageUrl);
	if (!fs.existsSync(originalImage)) {
		return res.status(500).send({ message: 'Bad Link' });
	}

	const waterMarkImage = await downloadAndSave(`wm-${id}`, wmImageUrl);
	if (!fs.existsSync(waterMarkImage)) {
		fs.unlink(originalImage, (err) => {
			if (err) console.log(err);
			console.log('Downloaded image deleted');
		});
		return res.status(500).send({ message: 'Bad Link' });
	}

	try {
		const main = async () => {
			const [image, logo] = await Promise.all([
				Jimp.read(originalImage),
				Jimp.read(waterMarkImage),
			]);

			const stripText = new Jimp(
				image.bitmap.width,
				heightForText,
				'white',
				(err, image) => {
					if (err) throw err;
				}
			);

			const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
			stripText.print(
				font,
				10,
				10,
				{
					text: waterMarkText,
					alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
				},
				image.bitmap.width,
				image.bitmap.height
			);
			image.composite(stripText, 0, image.bitmap.height - heightForText);

			logo.resize(image.bitmap.width / 10, Jimp.AUTO);

			const xMargin = (image.bitmap.width * LOGO_MARGIN_PERCENTAGE) / 100;
			const yMargin = (image.bitmap.width * LOGO_MARGIN_PERCENTAGE) / 100;

			const { X, Y } = getWaterMarkStart(
				wmPosition,
				image.bitmap.height,
				image.bitmap.width,
				logo.bitmap.height,
				logo.bitmap.width,
				xMargin,
				yMargin
			);

			return image.composite(logo, X, Y, [
				{
					mode: Jimp.BLEND_SCREEN,
					opacitySource: 0.1,
					opacityDest: 1,
				},
			]);
		};

		try {
			main().then((image) => {
				fs.unlink(originalImage, (err) => {
					if (err) console.log(err);
					console.log('Downloaded image deleted');
				});

				fs.unlink(waterMarkImage, (err) => {
					if (err) console.log(err);
					console.log('Downloaded image deleted');
				});

				image.getBuffer(Jimp.MIME_PNG, (err, response) => {
					if (err) {
						res.status(500).send({
							message: 'Server Error',
						});
						throw err;
					}

					res.send(response);
				});
			});
		} catch (err) {
			fs.unlink(originalImage, (err) => {
				if (err) console.log(err);
				console.log('Downloaded image deleted');
			});

			fs.unlink(waterMarkImage, (err) => {
				if (err) console.log(err);
				console.log('Downloaded image deleted');
			});

			res.status(500).send({ message: 'Server Error' });
		}
	} catch (err) {
		fs.unlink(originalImage, (err) => {
			if (err) console.log(err);
			console.log('Downloaded image deleted');
		});

		fs.unlink(waterMarkImage, (err) => {
			if (err) console.log(err);
			console.log('Downloaded image deleted');
		});
		console.log(err.message);
		res.status(500).send({
			message: 'Internal Server Error',
		});
	}
});

module.exports = router;
