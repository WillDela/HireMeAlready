import { db } from "@/lib/db";

// Prisma can't read or write `vector` columns (Unsupported type), so everything that
// touches Resume.embedding goes through here.

export const EMBEDDING_DIMENSIONS = 768;

function toVectorLiteral(values: number[]): string {
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Expected ${EMBEDDING_DIMENSIONS}-d embedding, got ${values.length}`);
  }
  return `[${values.join(",")}]`;
}

export async function setResumeEmbedding(resumeId: string, embedding: number[]) {
  await db.$executeRaw`
    UPDATE resume SET embedding = ${toVectorLiteral(embedding)}::vector WHERE id = ${resumeId}
  `;
}

