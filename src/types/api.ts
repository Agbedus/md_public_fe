export type SuccessResult<T = void> = T extends void
  ? { success: true }
  : { success: true; data: T };

export type ErrorResult = { success: false; error: string };

export type ActionResult<T = void> = SuccessResult<T> | ErrorResult;
