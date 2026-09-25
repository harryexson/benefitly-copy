import { NextRequest, NextResponse } from "next/server";
import { withUserContext } from "@/lib/database";
import { requireSession } from "@/lib/session";
import { withRouteErrorHandling } from "@/lib/api-errors";
import { assertUploadIsAllowed, getStorageAdapter, mediaTypeForContentType } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Multipart upload so the same endpoint works from a browser <input type="file"> FormData and
 * from React Native's fetch, which also builds FormData with { uri, name, type } file parts.
 */
export const POST = withRouteErrorHandling(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } }, { status: 401 });

  const storage = getStorageAdapter();
  if (!storage) {
    return NextResponse.json({ error: { code: "STORAGE_UNAVAILABLE", message: "Media upload is not configured on this server." } }, { status: 503 });
  }

  const { id: campaignId } = await params;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "A file is required." } }, { status: 400 });
  }
  const altText = typeof form?.get("altText") === "string" ? (form.get("altText") as string) : undefined;

  const contentType = file.type || "application/octet-stream";
  try {
    assertUploadIsAllowed(contentType, file.size);
  } catch (error) {
    return NextResponse.json({ error: { code: "UNSUPPORTED_FILE", message: error instanceof Error ? error.message : "Unsupported file." } }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `campaigns/${campaignId}/${Date.now()}-${(file.name || "upload").replace(/[^a-zA-Z0-9.\-_]/g, "-")}`;
  const uploaded = await storage.upload({ key, contentType, data: buffer });

  try {
    const [[media]] = await withUserContext(session.user.id, (tx) => [
      tx`select * from public.add_campaign_media(${campaignId}, ${uploaded.url}, ${mediaTypeForContentType(contentType)}, ${contentType}, ${buffer.byteLength}, ${altText ?? null})`,
    ]);
    return NextResponse.json({ data: media }, { status: 201 });
  } catch (error) {
    await storage.remove(key).catch(() => {});
    const message = error instanceof Error ? error.message : "Could not attach media to campaign";
    const status = message.includes("not authorized") ? 403 : message.includes("limited to") ? 409 : 400;
    return NextResponse.json({ error: { code: status === 403 ? "FORBIDDEN" : "MEDIA_FAILED", message } }, { status });
  }
});
