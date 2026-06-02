import {
  createEdgeContext,
  EdgeFunctionError,
  logEdgeEvent,
  safeErrorResponse,
  type EdgeContext,
} from "../_shared/edge.ts";
import { jsonResponse, readJson } from "../_shared/json.ts";

const FUNCTION_NAME = "manage-feature-requests";

type AdminAction =
  | {
      action: "update_status";
      requestId: string;
      status:
        | "submitted"
        | "under_review"
        | "planned"
        | "in_progress"
        | "released"
        | "declined";
      releaseVersion?: string;
      releaseNotes?: string;
    }
  | {
      action: "post_update";
      requestId: string;
      updateText: string;
    }
  | {
      action: "merge_requests";
      sourceRequestId: string;
      targetRequestId: string;
    }
  | {
      action: "archive_request";
      requestId: string;
    }
  | {
      action: "upsert_roadmap_item";
      item: {
        id?: string;
        title: string;
        description?: string;
        status: "planned" | "in_progress" | "released";
        releaseVersion?: string;
        releaseNotes?: string;
        linkedRequestIds?: string[];
        sortOrder?: number;
      };
    };

// @ts-ignore - Deno global available at runtime
const _Deno = Deno as typeof Deno & {
  env: { get(key: string): string | undefined };
};

function assertAdmin(request: Request) {
  const adminSecret = _Deno.env.get("FEATURE_REQUEST_ADMIN_SECRET");
  const requestSecret = request.headers.get("x-feature-request-admin-secret");

  if (adminSecret && requestSecret === adminSecret) {
    return;
  }

  throw new EdgeFunctionError(
    "auth_required",
    403,
    "Admin authorization is required.",
  );
}

async function notifyReleaseStakeholders(
  supabaseAdmin: EdgeContext["supabaseAdmin"],
  requestId: string,
  title: string,
  releaseNotes?: string,
) {
  const { data: request } = await supabaseAdmin
    .from("feature_requests")
    .select("user_id, title")
    .eq("id", requestId)
    .maybeSingle();

  const { data: voters } = await supabaseAdmin
    .from("feature_request_votes")
    .select("user_id")
    .eq("request_id", requestId);

  const recipientIds = new Set<string>();
  if (request?.user_id) {
    recipientIds.add(String(request.user_id));
  }

  for (const voter of voters ?? []) {
    if (voter.user_id) {
      recipientIds.add(String(voter.user_id));
    }
  }

  const body =
    releaseNotes ?? `${title} is now available in The Conservatory.`;

  const rows = [...recipientIds].map((userId) => ({
    user_id: userId,
    request_id: requestId,
    title: `${title} is now available`,
    body,
  }));

  if (!rows.length) {
    return;
  }

  await supabaseAdmin.from("feature_request_notifications").insert(rows);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  let context: EdgeContext | undefined;
  try {
    context = await createEdgeContext(request, FUNCTION_NAME);
    assertAdmin(request);

    const body = await readJson<AdminAction>(request);
    if (!body?.action) {
      throw new EdgeFunctionError(
        "validation_error",
        400,
        "A valid admin action is required.",
      );
    }

    switch (body.action) {
      case "update_status": {
        const { error } = await context.supabaseAdmin
          .from("feature_requests")
          .update({
            status: body.status,
            release_version: body.releaseVersion ?? null,
            release_notes: body.releaseNotes ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.requestId);

        if (error) {
          throw new EdgeFunctionError("server_error", 500, error.message);
        }

        if (body.status === "released") {
          const { data: requestRow } = await context.supabaseAdmin
            .from("feature_requests")
            .select("title")
            .eq("id", body.requestId)
            .maybeSingle();

          await notifyReleaseStakeholders(
            context.supabaseAdmin,
            body.requestId,
            String(requestRow?.title ?? "A requested feature"),
            body.releaseNotes,
          );
        }
        break;
      }
      case "post_update": {
        const { error } = await context.supabaseAdmin
          .from("feature_request_updates")
          .insert({
            request_id: body.requestId,
            update_text: body.updateText,
            created_by: context.userId,
          });

        if (error) {
          throw new EdgeFunctionError("server_error", 500, error.message);
        }

        await context.supabaseAdmin
          .from("feature_requests")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", body.requestId);
        break;
      }
      case "merge_requests": {
        const { error: sourceError } = await context.supabaseAdmin
          .from("feature_requests")
          .update({
            archived: true,
            merged_into_id: body.targetRequestId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.sourceRequestId);

        if (sourceError) {
          throw new EdgeFunctionError("server_error", 500, sourceError.message);
        }

        await context.supabaseAdmin.from("feature_request_updates").insert({
          request_id: body.sourceRequestId,
          update_text: "Merged into a related community request.",
          created_by: context.userId,
        });
        break;
      }
      case "archive_request": {
        const { error } = await context.supabaseAdmin
          .from("feature_requests")
          .update({
            archived: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.requestId);

        if (error) {
          throw new EdgeFunctionError("server_error", 500, error.message);
        }
        break;
      }
      case "upsert_roadmap_item": {
        const payload = {
          title: body.item.title,
          description: body.item.description ?? null,
          status: body.item.status,
          release_version: body.item.releaseVersion ?? null,
          release_notes: body.item.releaseNotes ?? null,
          linked_request_ids: body.item.linkedRequestIds ?? [],
          sort_order: body.item.sortOrder ?? 0,
          updated_at: new Date().toISOString(),
        };

        if (body.item.id) {
          const { error } = await context.supabaseAdmin
            .from("roadmap_items")
            .update(payload)
            .eq("id", body.item.id);
          if (error) {
            throw new EdgeFunctionError("server_error", 500, error.message);
          }
        } else {
          const { error } = await context.supabaseAdmin
            .from("roadmap_items")
            .insert(payload);
          if (error) {
            throw new EdgeFunctionError("server_error", 500, error.message);
          }
        }
        break;
      }
      default:
        throw new EdgeFunctionError(
          "validation_error",
          400,
          "Unsupported admin action.",
        );
    }

    logEdgeEvent(context, "request_success", {
      status: 200,
      action: body.action,
    });
    return jsonResponse({ success: true });
  } catch (error) {
    return safeErrorResponse(error, context);
  }
});
