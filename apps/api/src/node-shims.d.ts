declare module "node:http" {
  export const createServer: any;
  export type IncomingMessage = any;
  export type ServerResponse = any;
}

declare module "node:fs/promises" {
  export const mkdir: any;
  export const readFile: any;
  export const writeFile: any;
}

declare module "node:path" {
  export const dirname: any;
  export const join: any;
}

declare module "node:url" {
  export const fileURLToPath: any;
}

declare const process: {
  env: Record<string, string | undefined>;
};
