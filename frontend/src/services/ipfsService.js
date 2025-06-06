// ipfsService.js
import { create } from 'ipfs-http-client';

// 🎯 Connect to your local Docker node
const ipfs = create({ url: 'http://localhost:5001/api/v0' });

/**
 * Upload a file to IPFS (PDF, image, etc.)
 * @param {File | Blob} file
 * @returns {Promise<string>} - CID hash
 */
export const uploadToIPFS = async (file) => {
  if (!file) throw new Error('No file selected for upload');

  try {
    const result = await ipfs.add(file);
    console.log("✅ File uploaded to IPFS:", result);
    return result.path || result.cid.toString();
  } catch (error) {
    console.error("❌ Failed to upload to IPFS:", error);
    throw new Error('Upload to IPFS failed: ' + error.message);
  }
};

/**
 * Upload JSON metadata to IPFS
 * @param {Object} jsonData
 * @returns {Promise<string>} - CID hash
 */
export const uploadJSONToIPFS = async (jsonData) => {
  const buffer = new TextEncoder().encode(JSON.stringify(jsonData));

  try {
    const result = await ipfs.add(buffer);
    console.log("✅ JSON metadata uploaded:", result);
    return result.path || result.cid.toString();
  } catch (error) {
    console.error("❌ Failed to upload JSON:", error);
    throw new Error('Upload metadata failed: ' + error.message);
  }
};

/**
 * Get accessible IPFS gateway link
 * @param {string} cid
 * @returns {string}
 */
export const getIPFSGatewayURL = (cid) => {
  const cleanCID = String(cid).replace(/^\/|\/$/g, '').replace(/^ipfs\//, '');
  return `http://localhost:8080/ipfs/${cleanCID}`;
};

export default {
  uploadToIPFS,
  uploadJSONToIPFS,
  getIPFSGatewayURL
};
