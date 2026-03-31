import { createWorker } from 'tesseract.js';

let workerInstance = null;

export async function getOCRWorker() {
  if (!workerInstance) {
    workerInstance = await createWorker('eng');
    await workerInstance.setParameters({
      tessedit_char_whitelist: '0123456789/.-:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ()&,;™®',
      tesseract_create_pdf: '0',
      tessedit_pageseg_mode: 6, // Assume single column of text
    });
  }
  return workerInstance;
}

export async function terminateOCRWorker() {
  if (workerInstance) {
    await workerInstance.terminate();
    workerInstance = null;
  }
}
