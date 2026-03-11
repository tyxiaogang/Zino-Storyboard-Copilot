import { generateImage, setApiKey } from '@/commands/ai';
import { imageUrlToDataUrl, persistImageLocally } from '@/features/canvas/application/imageData';

import type { AiGateway, GenerateImagePayload } from '../application/ports';

export const tauriAiGateway: AiGateway = {
  setApiKey,
  generateImage: async (payload: GenerateImagePayload) => {
    const isKieModel = payload.model.startsWith('kie/');
    const isFalModel = payload.model.startsWith('fal/');
    const normalizedReferenceImages = payload.referenceImages
      ? await Promise.all(
        payload.referenceImages.map(async (imageUrl) =>
          isKieModel || isFalModel
            ? await imageUrlToDataUrl(imageUrl)
            : await persistImageLocally(imageUrl)
        )
      )
      : undefined;

    return await generateImage({
      prompt: payload.prompt,
      model: payload.model,
      size: payload.size,
      aspect_ratio: payload.aspectRatio,
      reference_images: normalizedReferenceImages,
      extra_params: payload.extraParams,
    });
  },
};
