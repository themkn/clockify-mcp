export class ClockifyError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "ClockifyError";
  }

  /** Human-facing one-liner used in MCP tool error responses. */
  toUserMessage(): string {
    return `Clockify: ${this.message} (HTTP ${this.status})`;
  }
}
