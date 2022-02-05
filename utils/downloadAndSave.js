const Downloader = require('nodejs-file-downloader');
const getExtension = require('./getExtension');

const downloadAndSave = async (id, uri) => {
	let filename;
	const downloader = new Downloader({
		url: uri,
		directory: './tmp/downloads',
		onBeforeSave: (deducedName) => {
			const extension = getExtension(deducedName);
			filename = `${id}.${extension}`;
			return filename;
		},
	});
	try {
		await downloader.download();
		return filename;
	} catch (error) {
		console.log('Download failed', error.msg);
	}
};

module.exports = downloadAndSave;
