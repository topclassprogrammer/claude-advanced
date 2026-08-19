import contentDisposition from 'content-disposition';

export function buildContentDisposition(filename: string): string {
  return contentDisposition(filename, { type: 'attachment' });
}
