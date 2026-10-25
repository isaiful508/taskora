type ErrorCode = 400 | 401 | 403 | 404 | 409 | 429 | 500;

export class ApiError extends Error {
  public readonly statusCode: ErrorCode;
  public readonly errors?: Record<string, string[]>;

  constructor(statusCode: ErrorCode, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = "ApiError";
  }

  static badRequest(message: string, errors?: Record<string, string[]>) {
    return new ApiError(400, message, errors);
  }
  static unauthorized(message = "Authentication required") {
    return new ApiError(401, message);
  }
  static forbidden(message = "You do not have permission to perform this action") {
    return new ApiError(403, message);
  }
  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }
  static conflict(message: string) {
    return new ApiError(409, message);
  }
  static tooMany(message: string) {
    return new ApiError(429, message);
  }
}
