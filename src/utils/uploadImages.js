var Readable = require("stream").Readable;
const fs = require("fs");

const GROUP_ID_VK = process.env.GROUP_ID_VK;
const ALBUM_ID_VK = process.env.ALBUM_ID_VK;
async function uploadImages(vk, images, albumId) {
  let newImages = [];
  for (let image of images) {
    const indexChar = image.indexOf(";");
    const meta = image.substring(0, indexChar);
    const base64 = image.substring(indexChar + 8);
    const type = meta.substring(5);
    const [, format] = type.split("/");
    const imgBuffer = Buffer.from(base64, "base64");
    const Reader = new Readable();

    Reader.push(imgBuffer);
    Reader.push(null);
    Reader.pipe(fs.createWriteStream(`temp.${format}`));
    result = await vk.uploader.upload({
      getUrlMethod: "photos.getUploadServer",
      getUrlParams: {
        group_id: GROUP_ID_VK,
        album_id: albumId ?? ALBUM_ID_VK,
      },
      saveMethod: "photos.save",
      saveParams: {
        group_id: GROUP_ID_VK,
        album_id: albumId ?? ALBUM_ID_VK,
      },
      file: `./temp.${format}`,
    });
    let maxWidthImage = { width: 0 };
    result[0].sizes.forEach((img) => {
      if (img.width > maxWidthImage.width) maxWidthImage = img;
    });

    smallWidthImage =
      result[0].sizes.find((img) => img.type === "m") ??
      result[0].sizes.find((img) => img.type === "s");

    newImages.push({
      ...result[0],
      sizes: undefined,
      MaxSize: maxWidthImage,
      MinSize: smallWidthImage,
    });
  }

  return newImages;
}
module.exports = { uploadImages };
