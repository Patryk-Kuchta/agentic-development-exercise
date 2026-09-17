/**
 * The plot embedding is 1536 float32 numbers. Stored as raw little-endian
 * bytes it costs 6 KiB a row instead of roughly 20 KiB as JSON text, and it
 * comes back out of SQLite without any parsing at all — which matters when
 * exercise 3 loads every vector in the table to compare them.
 *
 * Little-endian is not a choice we make here: `Float32Array` uses the host's
 * byte order, and every platform this repo runs on (x64, arm64) is
 * little-endian. A big-endian host would need an explicit `DataView` loop.
 */

const bytesPerFloat32 = 4;

/** Packs numbers into the bytes the `plot_embedding` BLOB column stores. */
export function encodeEmbedding(values: readonly number[]): Buffer {
  return Buffer.from(new Uint8Array(Float32Array.from(values).buffer));
}

/**
 * Unpacks those bytes again. The argument is `Uint8Array` rather than
 * `Buffer` on purpose: the raw `node:sqlite` driver hands back a plain
 * `Uint8Array` and Drizzle's buffer mode hands back a `Buffer`, and `Buffer`
 * is a subclass of `Uint8Array`, so the wider type accepts both.
 */
export function decodeEmbedding(bytes: Uint8Array): Float32Array {
  if (bytes.byteLength % bytesPerFloat32 !== 0) {
    throw new Error(
      `Expected an embedding whose byte length is a multiple of ${String(bytesPerFloat32)}, ` +
        `found ${String(bytes.byteLength)} bytes`,
    );
  }

  /* A Float32Array view has to start on a 4-byte boundary. Buffers from
     Node's pool and from node:sqlite always do, but a subarray of someone
     else's bytes need not, so copy in that rare case rather than throwing. */
  const aligned = bytes.byteOffset % bytesPerFloat32 === 0 ? bytes : new Uint8Array(bytes);

  return new Float32Array(aligned.buffer, aligned.byteOffset, aligned.byteLength / bytesPerFloat32);
}
