const { S3Client } = require("@aws-sdk/client-s3");
require('dotenv').config();

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

let s3Client;

try {
  if (region && accessKeyId && secretAccessKey) {
    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    console.log('✅ AWS S3 Client Initialized');
  } else {
    console.warn('⚠️ AWS S3 credentials missing in .env. Uploads will fail.');
  }
} catch (err) {
  console.error('❌ AWS S3 Initialization Error:', err.message);
}

module.exports = s3Client;

