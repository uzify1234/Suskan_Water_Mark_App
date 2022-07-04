## For video watermark

Install ffmpeg
set binaries in .env files

for linux they might be somewhere inside /usr/bin
for windows they might be somewhere inside C:/ffmpeg/bin

## For PDF

install pdftk
sudo snap install pdftk

## Installation

Make sure above requirements are completed and env variables are set. Follow these steps:

npm install
npm start

## For calling APIs

## Video Watermark

axios.get(
`http://localhost:5000/api/v1/watermark-video`,
{
params: {
imageUri: imageUri,
videoUri: fileUri,
},
responseType: 'blob',
}
);

## PDF Watermark

axios.get(
`http://localhost:5000/api/v1/watermark-pdf`,
{
params: {
imageUri: imageUri,
pdfUri: fileUri,
waterMarkText: text,
},
responseType: 'blob',
}
);
