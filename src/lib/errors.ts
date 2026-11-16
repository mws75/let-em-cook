/**
 * An error whose message is written for end users and is safe to return in an
 * API response. Error handlers (e.g. handleOpenAIError) pass its message and
 * status through; any other Error gets a generic message so internal details
 * (DB errors, parse failures, stack info) never reach the client.
 *
 *   throw new UserFacingError("We couldn't validate your ingredients. Please try again");
 */
export class UserFacingError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
  ) {
    super(message);
    this.name = "UserFacingError";
  }
}
