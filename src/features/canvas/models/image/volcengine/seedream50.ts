import type { ImageModelDefinition } from '../../types';

export const VOLCENGINE_SEEDREAM_50_MODEL_ID = 'volcengine/doubao-seedream-5-0-260128';

export const imageModel: ImageModelDefinition = {
  id: VOLCENGINE_SEEDREAM_50_MODEL_ID,
  mediaType: 'image',
  displayName: 'Seedream 5.0',
  providerId: 'volcengine',
  description: '豆包 Seedream 5.0 · 高质量图像生成',
  eta: '30s',
  expectedDurationMs: 30000,
  defaultAspectRatio: '1:1',
  defaultResolution: '2K',
  aspectRatios: [
    { value: '1:1', label: '1:1' },
    { value: '16:9', label: '16:9' },
    { value: '9:16', label: '9:16' },
    { value: '4:3', label: '4:3' },
    { value: '3:4', label: '3:4' },
    { value: '3:2', label: '3:2' },
    { value: '2:3', label: '2:3' },
    { value: '21:9', label: '21:9' },
  ],
  resolutions: [
    { value: '1K', label: '1K' },
    { value: '2K', label: '2K' },
    { value: '4K', label: '4K' },
  ],
  resolveRequest: () => ({
    requestModel: VOLCENGINE_SEEDREAM_50_MODEL_ID,
    modeLabel: '生成模式',
  }),
};
