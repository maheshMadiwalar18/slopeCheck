export type Result<T, E = Error> = Success<T> | Failure<E>;

export interface Success<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Failure<E> {
  readonly ok: false;
  readonly error: E;
}

export const ok = <T>(value: T): Success<T> => ({ ok: true, value });
export const fail = <E>(error: E): Failure<E> => ({ ok: false, error });

export const isSuccess = <T, E>(result: Result<T, E>): result is Success<T> => result.ok === true;
export const isFailure = <T, E>(result: Result<T, E>): result is Failure<E> => result.ok === false;
