import {
  createEdgeContext,
  EdgeFunctionError,
  logEdgeEvent,
  safeErrorResponse,
} from "../_shared/edge";
import { jsonResponse } from "../_shared/json";

const FUNCTION_NAME = "delete-account";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  let context;
  try {
    context = await createEdgeContext(request, FUNCTION_NAME);
    const { error: deleteError } =
      await context.supabaseAdmin.auth.admin.deleteUser(context.userId);

    if (deleteError) {
      throw new EdgeFunctionError(
        "server_error",
        500,
        "Account deletion could not be completed.",
      );
    }

    logEdgeEvent(context, "request_success", { status: 200 });
    return jsonResponse({ success: true });
  } catch (error) {
    return safeErrorResponse(error, context);
  }
});
