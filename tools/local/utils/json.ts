import { readTextFile } from './fs.ts';

export function parseJson(text: string): unknown {
  return JSON.parse(text);
}

export function parseJsonFile(filePath: string): unknown {
  return parseJson(readTextFile(filePath));
}
