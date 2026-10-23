/** `input` is the cleaned data to send, or null when something is wrong; `errors` says what. */
export type Validation<I, E> = { input: I | null; errors: E };
