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

// @route       POST api/v1/watermark
// @desc        Do water-mark to video
// @access      Public
router.get('/', async (req, res) => {
	const videoUri = req.query.videoUri;
	const imageUri = req.query.imageUri;
	const id = uuid.v4();

	downloadAndSave(id, imageUri).then((image) => {
		const imageFile = `./tmp/downloads/${image}`;
		downloadAndSave(id, videoUri).then((video) => {
			const videoFile = `./tmp/downloads/${video}`;
			const waterMarkedVideo = `./tmp/output/${id}.mp4`;
			try {
				ffmpeg()
					.input(videoFile)
					.input(imageFile)
					.videoCodec('libx264')
					.outputOptions('-pix_fmt yuv420p')
					.complexFilter([
						'[1]scale=iw*0.3:-1[wm];[0][wm]overlay=10:10',
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
							console.log('Video File deleted cta');
						});
						fs.unlink(imageFile, function (err) {
							if (err) throw err;
							console.log('Watermark File deleted cta');
						});
					})
					.saveToFile(waterMarkedVideo, () => {
						console.log('here');
					});
			} catch (err) {
				console.error('error', err.msg);
				fs.unlink(videoFile, function (err) {
					if (err) throw err;
					console.log('Video File deleted cta');
				});
				fs.unlink(imageFile, function (err) {
					if (err) throw err;
					console.log('Watermark File deleted cta');
				});
				res.status(500).send('Server Error');
			}
		});
	});
});

module.exports = router;
