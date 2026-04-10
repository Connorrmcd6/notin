import { ZodError } from "zod/v4";

export function withErrorHandler(
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof ZodError) {
        return Response.json(
          { error: "Validation failed", details: error.issues },
          { status: 400 },
        );
      }

      if (error instanceof Error) {
        if (error.message === "Unauthorized") {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (error.message === "Forbidden") {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }
        if (error.message === "Not found") {
          return Response.json({ error: "Not found" }, { status: 404 });
        }
        if (error.message.startsWith("BUSINESS:")) {
          return Response.json(
            { error: error.message.slice("BUSINESS:".length) },
            { status: 422 },
          );
        }
      }

      console.error("Unhandled error:", error);
      return Response.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
