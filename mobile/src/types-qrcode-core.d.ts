// The part of the `qrcode` package that is plain JavaScript: it works out the black and white squares.
// (The package's main entry also draws to files and canvases, which a phone does not have.)
declare module 'qrcode/lib/core/qrcode' {
  export function create(text: string, options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }): {
    modules: { size: number; get: (row: number, col: number) => number };
  };
}
