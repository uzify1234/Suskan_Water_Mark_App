require('dotenv').config();
const express = require('express');
const router = express.Router();
const ffmpeg = require('fluent-ffmpeg');
const uuid = require('uuid');
const fs = require('fs');
const downloadAndSave = require('../../utils/downloadAndSave');

ffmpeg.setFfmpegPath(process.env.FFMPEG);
ffmpeg.setFfprobePath(process.env.FFPROBE);
//ffmpeg.setFlvtoolPath(process.env.FLVTOOL);

const heightForText = 20;
const margin = 10;

const getWaterMarkStart = (position) => {
	let overlay = `overlay=${margin}:${margin}`;

	if (position == 'TL') {
		overlay = `overlay=${margin}:${margin}`;
	} else if (position == 'TR') {
		overlay = `overlay=main_w-overlay_w-${margin}:${margin}`;
	} else if (position == 'BL') {
		overlay = `overlay=${margin}:main_h-overlay_h-${
			margin + heightForText
		}`;
	} else if (position == 'BR') {
		overlay = `overlay=main_w-overlay_w-${margin}:main_h-overlay_h-${
			margin + heightForText
		}`;
	}

	return overlay;
};

// @route       POST api/v1/watermark
// @desc        Do water-mark to video
// @access      Public
router.post('/', async (req, res) => {
	const { videoUrl, imageUrl, waterMarkText, wmPosition } = req.body;

	if (!videoUrl || !imageUrl || !waterMarkText || !wmPosition) {
		return res.status(400).send({ message: 'Bad Request' });
	}
	const id = uuid.v4();

	const imageFile = await downloadAndSave(id, imageUrl);
	if (!fs.existsSync(imageFile)) {
		return res.status(500).send({ message: 'Bad Link' });
	}

	const videoFile = await downloadAndSave(id, videoUrl);
	if (!fs.existsSync(videoFile)) {
		fs.unlink(imageFile, (err) => {
			if (err) console.log(err);
			console.log('Downloaded image deleted');
		});
		return res.status(500).send({ message: 'Bad Link' });
	}

	try {
		const waterMarkedVideo = `./tmp/output/${id}.mp4`;
		const overlay = getWaterMarkStart(wmPosition);

		ffmpeg()
			.input(videoFile)
			.input(imageFile)
			.videoCodec('libx264')
			.outputOptions('-pix_fmt yuv420p')
			.complexFilter([
				`[1]scale=iw*0.2:-1[wm];[0][wm]${overlay},drawbox=x=0:y=ih-${heightForText}:w=iw:h=${heightForText}:color=white:t=fill,drawtext=text=${waterMarkText}:fontsize=16:fontcolor=black:x=(w-text_w)/2:y=(h-text_h-2)`,
			])
			.on('end', function (stdout, stderr) {
				console.log('Finished');
				res.download(waterMarkedVideo, function (err) {
					if (err) throw err;

					fs.unlink(waterMarkedVideo, function (err) {
						if (err) throw err;
						console.log('File deleted');
					});
				});
				fs.unlink(videoFile, function (err) {
					if (err) throw err;
					console.log('Video File deleted');
				});
				fs.unlink(imageFile, function (err) {
					if (err) throw err;
					console.log('Watermark File deleted');
				});
			})
			.on('error', function (err) {
				console.log('an error happened: ' + err.message);
				fs.unlink(videoFile, function (err) {
					if (err) throw err;
					console.log('Video File deleted');
				});
				fs.unlink(imageFile, function (err) {
					if (err) throw err;
					console.log('Watermark File deleted');
				});
			})
			.saveToFile(waterMarkedVideo, () => {
				console.log('here');
			});
	} catch (err) {
		console.error('error', err.msg);
		fs.unlink(videoFile, function (err) {
			if (err) throw err;
			console.log('Video File deleted');
		});
		fs.unlink(imageFile, function (err) {
			if (err) throw err;
			console.log('Watermark File deleted');
		});
		res.status(500).send('Server Error');
	}
});

module.exports = router;
