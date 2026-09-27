import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { timed } from "@/lib/log";

// DigitalOcean Spaces (S3-compatible). The browser uploads straight to Spaces with a
// presigned PUT, so the bucket needs a CORS rule allowing PUT from our origins.

const s3 = new S3Client({
  region: process.env.SPACES_REGION ?? "us-east-1",
  endpoint: process.env.SPACES_ENDPOINT,
  credentials: {
    accessKeyId: process.env.SPACES_KEY ?? "",
    secretAccessKey: process.env.SPACES_SECRET ?? "",
  },
  // Newer SDKs add CRC32 checksums to presigned PUTs by default, which Spaces rejects.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const bucket = () => {
  const name = process.env.SPACES_BUCKET;
  if (!name) throw new Error("SPACES_BUCKET is not set");
  return name;
};

const UPLOAD_URL_TTL_SECONDS = 5 * 60;

/** Presigned PUT URL. The client must send the same Content-Type it was signed with. */
export async function createUploadUrl(storageKey: string, contentType: string) {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket(), Key: storageKey, ContentType: contentType }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );
}

/** Presigned GET URL, e.g. for letting the owner re-download their resume. */
export async function createDownloadUrl(storageKey: string) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket(), Key: storageKey }), {
    expiresIn: UPLOAD_URL_TTL_SECONDS,
  });
}

/** Reads an object into memory (resumes and call recordings are small enough). */
export async function getObjectBuffer(storageKey: string): Promise<Buffer> {
  return timed("storage", "download", async () => {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket(), Key: storageKey }));
    if (!res.Body) throw new Error(`Empty object: ${storageKey}`);
    return Buffer.from(await res.Body.transformToByteArray());
  }, { key: storageKey });
}

export const storageKeys = {
  resume: (userId: string, resumeId: string) => `resumes/${userId}/${resumeId}.pdf`,
  // Keyed by recording, not participant: rejoining a call starts a second recording.
  recording: (interviewId: string, recordingId: string, ext: string) =>
    `recordings/${interviewId}/${recordingId}.${ext}`,
};
