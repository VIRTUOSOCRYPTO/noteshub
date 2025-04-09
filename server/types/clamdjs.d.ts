declare module 'clamdjs' {
  interface Scanner {
    ping(): Promise<string>;
    version(): Promise<string>;
    scanFile(filePath: string): Promise<string>;
    scanStream(stream: NodeJS.ReadableStream): Promise<string>;
  }

  export function createScanner(host: string, port: number): Scanner;
}