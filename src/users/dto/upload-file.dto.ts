export class UploadFileDto {
  filename: string;
  chunk: any;
}
export enum UploadStage {
  uploading,
  complete,
  failed,
}
export interface UploadStatus {
  message: string;
  stage: UploadStage;
}
