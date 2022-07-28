export class ApiError extends Error {
  name = 'ApiError'
  constructor(message: string) {
    super(message)
  }
}
