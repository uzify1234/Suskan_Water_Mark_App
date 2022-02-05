const getExtension = (name) => {
	const data = name.split('.');
	return data[data.length - 1];
};

module.exports = getExtension;
