import { createWorker } from 'tesseract.js';

let workerInstance = null;

export async function getOCRWorker() {
  if (!workerInstance) {
    workerInstance = await createWorker('eng');
    await workerInstance.setParameters({
      tessedit_char_whitelist: '0123456789/.-:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ()&,;™®\n',
      tesseract_create_pdf: '0',
      tessedit_pageseg_mode: 3, // Fully automatic page segmentation (better for product labels)
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
