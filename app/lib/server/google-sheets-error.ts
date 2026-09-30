export type GoogleSheetsErrorKind =
  | "configuration"
  | "timeout"
  | "network"
  | "upstream"
  | "invalid-response"
  | "conflict"
  | "unsupported-field";

export class GoogleSheetsError extends Error {
  constructor(
    readonly kind: GoogleSheetsErrorKind,
    readonly upstreamCode?: string,
    readonly currentValue?: string,
    readonly detail?: string,
  ) {
    super(kind);
    this.name = "GoogleSheetsError";
  }
}
