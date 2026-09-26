import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isPaidForTool } from "@/lib/usage";
import {
  ALLOWED_GIF_MIME,
  ALLOWED_IMAGE_MIME,
  MAX_GIF_BYTES,
  MAX_IMAGE_BYTES,
  type AvatarKind,
} from "@/lib/chatbot-bot-avatars";

// Handles a single avatar file upload for the "Add Bot Avatar" builder.
// Not scoped to a bot id in the URL — the "create a new bot" form doesn't
// have a bot id yet when the owner uploads an avatar, so files land under
// the uploader's own folder (storage RLS only checks the first path
// segment) and get attached to a specific bot when the form is saved.
const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kindRaw = formData.get("kind");
  const kind: AvatarKind = kindRaw === "gif" ? "gif" : "image";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (kind === "gif") {
    const isPaid = await isPaidForTool(user.id, "chatbot");
    if (!isPaid) {
      return NextResponse.json(
        { error: "GIF avatars are a paid feature." },
        { status: 403 }
      );
    }
  }

  const allowedMime = kind === "gif" ? ALLOWED_GIF_MIME : ALLOWED_IMAGE_MIME;
  if (!allowedMime.includes(file.type)) {
    return NextResponse.json(
      {
        error:
          kind === "gif"
            ? "Only GIF files can be uploaded here."
            : "Only JPG or PNG files can be uploaded here.",
      },
      { status: 400 }
    );
  }

  const maxBytes = kind === "gif" ? MAX_GIF_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        error: `File is too large. Max size is ${Math.round(maxBytes / 1024)}KB for ${
          kind === "gif" ? "GIFs" : "images"
        }.`,
      },
      { status: 400 }
    );
  }

  const ext = EXT_BY_MIME[file.type] ?? "bin";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("bot-avatars")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from("bot-avatars").getPublicUrl(path);

  return NextResponse.json({ url: publicUrlData.publicUrl });
}
