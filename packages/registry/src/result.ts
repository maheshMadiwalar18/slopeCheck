export type HttpResult<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
export const ok = <T>(value: T): HttpResult<T, never> => ({ ok: true, value });
export const fail = <E>(error: E): HttpResult<never, E> => ({ ok: false, error });
