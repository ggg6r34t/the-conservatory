export class AuthClientError extends Error {
  code: string;
  retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "AuthClientError";
    this.code = code;
    this.retryable = retryable;
  }
}
