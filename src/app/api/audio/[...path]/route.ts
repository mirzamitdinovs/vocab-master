import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

function resolveAudioPath(segments: string[]) {
  const safeSegments = segments.filter((segment) => segment && segment !== "." && segment !== "..");
  const baseDir = path.resolve(process.cwd(), "..", "assets", "audio");
  const target = path.resolve(baseDir, ...safeSegments);
  if (!target.startsWith(baseDir)) {
    return null;
  }
  return target;
}

export async function GET(
  _request: Request,
  { params }: { params: { path: string[] } },
) {
  const target = resolveAudioPath(params.path || []);
  if (!target) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  if (!fs.existsSync(target)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const data = await fs.promises.readFile(target);
  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
