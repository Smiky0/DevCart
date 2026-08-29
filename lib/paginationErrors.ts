/**
 * Thrown when a pagination cursor fails signature verification or is
 * malformed. API routes map this to HTTP 400 instead of a 500.
 */
export class InvalidCursorError extends Error {
    constructor() {
        super("Invalid cursor");
        this.name = "InvalidCursorError";
    }
}
