import { Memory, MemoryType } from '../../types/memory';

const MIN_KEYWORD_LENGTH = 4;
const MAX_KEYWORDS = 8;
const FACT_PATTERNS: Array<(text: string) => string | null> = [
  (text: string) => {
    const match = text.match(/\b(i am|i'm|i work as|i live in)\s+([^.!\n]+)/i);
    return match ? `${match[1]} ${match[2]}`.trim() : null;
  },
  (text: string) => {
    const match = text.match(/\bmy (?:role|job|profession)\s+is\s+([^.!\n]+)/i);
    return match ? `my role is ${match[1].trim()}` : null;
  },
];

function makeMemory(
  type: MemoryType,
  content: string,
  keywords: string[],
  conversationId: string,
  messageId: string,
  confidence: number
): Memory {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    type,
    content,
    keywords: keywords
      .map(keyword => keyword.trim().toLowerCase())
      .filter(Boolean),
    confidence,
    source: {
      conversationId,
      messageId,
      timestamp: now,
    },
    lastAccessed: now,
    accessCount: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(token => token.length >= MIN_KEYWORD_LENGTH)
    .slice(0, MAX_KEYWORDS);
}

/**
 * Lightweight heuristic extractor for memorable facts.
 * This avoids external API calls while still surfacing useful context.
 */
export async function extractMemoriesFromMessage(
  userMessage: string,
  aiResponse: string,
  conversationId: string,
  messageId: string = 'latest'
): Promise<Memory[]> {
  const memories: Memory[] = [];
  const combined = `${userMessage}\n${aiResponse}`;

  const nameMatch = userMessage.match(/my name is\s+([^.!\n]+)/i);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    memories.push(
      makeMemory(
        'relationship',
        `User's name is ${name}`,
        extractKeywords(name),
        conversationId,
        messageId,
        0.8
      )
    );
  }

  const preferenceMatch = userMessage.match(/i\s+(like|love|prefer)\s+([^.!\n]+)/i);
  if (preferenceMatch) {
    const preference = preferenceMatch[2].trim();
    memories.push(
      makeMemory(
        'preference',
        `User prefers ${preference}`,
        extractKeywords(preference),
        conversationId,
        messageId,
        0.7
      )
    );
  }

  const instructionMatch = combined.match(/please\s+(?:respond|reply|address)\s+([^.!\n]+)/i);
  if (instructionMatch) {
    const instruction = instructionMatch[1].trim();
    memories.push(
      makeMemory(
        'instruction',
        `Follow instruction: ${instruction}`,
        extractKeywords(instruction),
        conversationId,
        messageId,
        0.65
      )
    );
  }

  const projectMatch = combined.match(/working on\s+([^.!\n]+)/i);
  if (projectMatch) {
    const project = projectMatch[1].trim();
    memories.push(
      makeMemory(
        'context',
        `User is working on ${project}`,
        extractKeywords(project),
        conversationId,
        messageId,
        0.6
      )
    );
  }

  let fact: string | null = null;
  for (const pattern of FACT_PATTERNS) {
    const result = pattern(userMessage);
    if (result) {
      fact = result;
      break;
    }
  }

  if (fact) {
    memories.push(
      makeMemory(
        'fact',
        fact,
        extractKeywords(fact),
        conversationId,
        messageId,
        0.55
      )
    );
  }

  return memories;
}
