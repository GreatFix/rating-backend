function checkImages(oldImages, newImages) {
  let toDelete = [...oldImages];
  const alreadyHave = [];
  const newImagesWithoutOld = [];
  for (const newImg of newImages) {
    if (newImg?.id) {
      const img = oldImages.find((oldImg) => newImg.id === oldImg.id);
      if (img) {
        alreadyHave.push(img);
        toDelete = toDelete.filter((oldImg) => oldImg.id !== img.id);
      }
    } else {
      newImagesWithoutOld.push(newImg);
    }
  }
  return { toDelete, alreadyHave, newImagesWithoutOld };
}

module.exports = { checkImages };
