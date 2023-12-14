import {IncomingMessage} from "node:http";

const https = require('https');
const fs = require('fs');
const path = require('path');

export async function saveImageToFile(imgDir:string,fileName:string, imageUrl:string) {
    mkdirSyncRecursive(imgDir)
    // Create image directory if it doesn't exist
    const filePath = path.resolve(imgDir, fileName);

    // Download image
    const response = await downloadImage(imageUrl);

    // Write image file
    fs.writeFileSync(filePath, response);

    return filePath;
}

function downloadImage(url:string) {
    return new Promise<Buffer>((resolve) => {
        https.get(url, (res: IncomingMessage) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        });
    });
}

export function mkdirSyncRecursive(filename:string) {
    const parts = filename.split(path.sep);
    for(let i = 1; i <= parts.length; i++) {
        if(parts[i - 1] === '') continue
        const segment = parts.slice(0, i).join(path.sep);
        if (!fs.existsSync(segment)) {
            fs.mkdirSync(segment);
        }
    }
}