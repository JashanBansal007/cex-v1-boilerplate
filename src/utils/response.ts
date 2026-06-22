import type { Response } from "express";

interface SuccessResult {
  success: true;
  [key: string]: unknown;
}

interface ErrorResult {
  success: false;
  error: string;
}

type ServiceResult = SuccessResult | ErrorResult;

/**
 * Forwards a service-layer result to the HTTP response with the
 * appropriate status code.  Replaces the duplicated
 *   if (result.success) { res.status(X).json(result) }
 *   else               { res.status(Y).json(result) }
 * pattern that was repeated in every route handler.
 */
export function handleServiceResult(
  res: Response,
  result: ServiceResult,
  successStatus = 200,
  errorStatus = 400
): void {
  if (result.success) {
    res.status(successStatus).json(result);
  } else {
    res.status(errorStatus).json(result);
  }
}
