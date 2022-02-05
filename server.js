const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.options('*', cors());

app.use(express.json({ extended: false }));

app.get('/', (req, res) => {
	res.send('API Running');
});

app.use('/api/v1/watermark-video', require('./routes/api/video'));
app.use('/api/v1/watermark-pdf', require('./routes/api/pdf'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(`Server started at Port ${PORT}`);
});
