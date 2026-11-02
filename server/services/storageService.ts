import { ENV } from '../config/env';

export class StorageService {
  public static async uploadDocument(fileName: string, buffer: Buffer, mimeType: string): Promise<{ fileUrl: string; key: string }> {
    if (!ENV.STORAGE.isConfigured) {
      console.warn('[Storage] Object storage credentials not configured. Returning local mock object URL.');
      return {
        fileUrl: `${ENV.APP_URL}/uploads/${fileName}`,
        key: `mock_key_${fileName}`,
      };
    }
    // Real S3 / GCS upload implementation goes here
    const key = `docs/${Date.now()}_${fileName}`;
    return {
      fileUrl: `https://${ENV.STORAGE.BUCKET}.s3.${ENV.STORAGE.REGION}.amazonaws.com/${key}`,
      key,
    };
  }
}
