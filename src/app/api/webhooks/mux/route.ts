import Mux from "@mux/ts";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service credentials are not configured.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function findLesson(
  supabase: ReturnType<typeof getServiceClient>,
  uploadId: string | undefined,
  assetId: string | undefined,
) {
  if (uploadId) {
    const result = await supabase
      .from("lessons")
      .select("id")
      .eq("mux_upload_id", uploadId)
      .maybeSingle();
    if (result.error || result.data) return result;
  }

  if (assetId) {
    return supabase
      .from("lessons")
      .select("id")
      .eq("mux_asset_id", assetId)
      .maybeSingle();
  }

  return { data: null, error: null };
}

function getAssetErrorMessage(errors: { type?: string; messages?: string[] } | undefined) {
  const type = errors?.type?.trim();
  const message = errors?.messages?.find((value) => value.trim())?.trim();
  const detail = message ? `: ${message.slice(0, 400)}` : "";
  return `Mux asset processing failed${type ? ` (${type})` : ""}${detail}`;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json({ error: "Webhook verification is not configured." }, { status: 500 });
  }

  const body = await request.text();
  let event: Awaited<ReturnType<Mux["webhooks"]["unwrap"]>>;

  try {
    const mux = new Mux({ webhookSecret });
    event = await mux.webhooks.unwrap(body, request.headers, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (
    event.type !== "video.upload.created"
    && event.type !== "video.asset.ready"
    && event.type !== "video.asset.errored"
  ) {
    return Response.json({ received: true, ignored: true });
  }

  let supabase: ReturnType<typeof getServiceClient>;
  try {
    supabase = getServiceClient();
  } catch {
    return Response.json({ error: "Webhook database access is not configured." }, { status: 500 });
  }

  if (event.type === "video.upload.created") {
    const lesson = await findLesson(supabase, event.data.id, undefined);
    if (lesson.error) {
      return Response.json({ error: "Unable to update the lesson." }, { status: 500 });
    }
    if (!lesson.data) {
      return Response.json({ received: true, ignored: true, matched: false });
    }

    const { error } = await supabase
      .from("lessons")
      .update({ video_status: "pending" })
      .eq("id", lesson.data.id)
      .neq("video_status", "ready");
    if (error) return Response.json({ error: "Unable to update the lesson." }, { status: 500 });

    return Response.json({ received: true, updated: true });
  }

  const lesson = await findLesson(supabase, event.data.upload_id, event.data.id);
  if (lesson.error) {
    return Response.json({ error: "Unable to find the lesson." }, { status: 500 });
  }
  if (!lesson.data) {
    return Response.json({ received: true, ignored: true, matched: false });
  }

  if (event.type === "video.asset.ready") {
    const playbackId = event.data.playback_ids?.[0]?.id;
    const { error } = await supabase
      .from("lessons")
      .update({
        mux_asset_id: event.data.id,
        mux_playback_id: playbackId ?? null,
        video_status: "ready",
        video_ready_at: new Date().toISOString(),
        video_error: null,
      })
      .eq("id", lesson.data.id);
    if (error) return Response.json({ error: "Unable to update the lesson." }, { status: 500 });

    return Response.json({ received: true, updated: true });
  }

  const { error } = await supabase
    .from("lessons")
    .update({
      video_status: "errored",
      video_error: getAssetErrorMessage(event.data.errors),
    })
    .eq("id", lesson.data.id);
  if (error) return Response.json({ error: "Unable to update the lesson." }, { status: 500 });

  return Response.json({ received: true, updated: true });
}
