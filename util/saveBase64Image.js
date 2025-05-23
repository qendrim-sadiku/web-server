// utils/saveBase64Image.js
const fs = require('fs');
const path = require('path');

module.exports = function saveBase64Image(base64, userId, index) {
  const matches = base64.match(/^data:(.+);base64,(.+)$/);
  if (!matches) throw new Error('Invalid base64 string');

  const ext = matches[1].split('/')[1] || 'png';
  const buffer = Buffer.from(matches[2], 'base64');
  const filename = `${Date.now()}-${userId}-${index}.${ext}`;
  const filepath = path.join(__dirname, '..', 'uploads', filename);

  fs.writeFileSync(filepath, buffer);
  return `/uploads/${filename}`;
};
