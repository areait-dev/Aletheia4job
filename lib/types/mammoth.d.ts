declare module 'mammoth' {
  interface ExtractResult {
    value: string;
    messages: any[];
  }
  interface Options {
    buffer?: Buffer;
    path?: string;
  }
  export function extractRawText(options: Options): Promise<ExtractResult>;
}