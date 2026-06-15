// Expected failures carry the HTTP status the web layer should return.
// Anything that isn't an AppError is an unexpected bug -> generic 500.
export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}
