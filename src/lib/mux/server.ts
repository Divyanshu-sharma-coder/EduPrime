import Mux from "@mux/ts";

function getMuxClient() {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;

  if (!tokenId || !tokenSecret) {
    throw new Error("Mux credentials are not configured.");
  }

  return new Mux({ tokenId, tokenSecret });
}

export async function createMuxDirectUpload(corsOrigin: string) {
  return getMuxClient().video.uploads.create({
    cors_origin: corsOrigin,
    new_asset_settings: {
      playback_policies: ["signed"],
    },
  });
}

export async function cancelMuxDirectUpload(uploadId: string) {
  return getMuxClient().video.uploads.cancel(uploadId);
}
