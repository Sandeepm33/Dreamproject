const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = require("./s3Config");

/**
 * Delete an object from S3 bucket
 * @param {string} fileUrl - The full URL of the file or the filename/key
 */
const deleteFromS3 = async (fileUrl) => {
  if (!fileUrl || !s3Client) return;

  try {
    // Extract the key from the URL
    // S3 URL format: https://bucket-name.s3.region.amazonaws.com/key
    let key = fileUrl;
    if (fileUrl.startsWith('http')) {
      const urlParts = fileUrl.split('/');
      key = urlParts[urlParts.length - 1];
    }

    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`✅ Deleted from S3: ${key}`);
  } catch (err) {
    console.error(`❌ S3 Delete Error for ${fileUrl}:`, err.message);
  }
};

module.exports = { deleteFromS3 };
