import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type ImageData = { blob: Blob; dataUrl: string };

export async function processFileToImages(file: File): Promise<ImageData[]> {
    const JPEG_QUALITY = 0.85;

    if (file.type.startsWith("image/")) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");

                if (!ctx) return reject(new Error("Canvas context failed"));
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve([{ blob, dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY) }]);
                    }
                    else {
                        reject(new Error("Blob conversion failed"));
                    }
                }, "image/jpeg", JPEG_QUALITY);
            };
            img.onerror = () => reject(new Error("Image load failed"));
            img.src = objectUrl;
        });
    }

    if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const pagePromises = Array.from({ length: pdf.numPages }, async (_, i) => {
            const page = await pdf.getPage(i + 1);
            const viewport = page.getViewport({ scale: 1.5 });

            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d");

            if (!ctx) throw new Error("Canvas rendering failed");

            const renderParams = { canvasContext: ctx, viewport } as unknown as Parameters<typeof page.render>[0];
            await page.render(renderParams).promise;

            return new Promise<ImageData>((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve({ blob, dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY) });
                    }
                    else {
                        reject(new Error("Blob conversion failed"));
                    }
                }, "image/jpeg", JPEG_QUALITY);
            });
        });
        return await Promise.all(pagePromises);
    }
    throw new Error("Unsupported file type.");
}