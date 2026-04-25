import { S3Client } from "@aws-sdk/client-s3";

type RequiredR2EnvVar =
  | "R2_ACCOUNT_ID"
  | "R2_ACCESS_KEY_ID"
  | "R2_SECRET_ACCESS_KEY"
  | "R2_BUCKET"
  | "R2_ENDPOINT";

let cachedClient: S3Client | null = null;

function getRequiredEnv(name: RequiredR2EnvVar): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Saknar miljövariabel: ${name}`);
  }
  return value.trim();
}

function getR2Config() {
  const accountId = getRequiredEnv("R2_ACCOUNT_ID");
  const accessKeyId = getRequiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getRequiredEnv("R2_SECRET_ACCESS_KEY");
  const bucket = getRequiredEnv("R2_BUCKET");
  const endpoint = getRequiredEnv("R2_ENDPOINT");

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint,
  };
}

export function getR2Client(): S3Client {
  if (cachedClient) {
    return cachedClient;
  }

  const { accessKeyId, secretAccessKey, endpoint } = getR2Config();
  cachedClient = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  return cachedClient;
}

export function getR2Bucket(): string {
  return getR2Config().bucket;
}

export function getR2PublicBaseUrl(): string | null {
  const value = process.env.R2_PUBLIC_BASE_URL;
  if (!value || value.trim() === "") {
    return null;
  }
  return value.trim();
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
