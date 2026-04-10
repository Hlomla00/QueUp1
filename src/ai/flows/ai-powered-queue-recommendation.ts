'use server';
/**
 * @fileOverview An AI agent that provides queue recommendations for government branches.
 *
 * - aiPoweredQueueRecommendation - A function that handles the queue recommendation process.
 * - AIPoweredQueueRecommendationInput - The input type for the aiPoweredQueueRecommendation function.
 * - AIPoweredQueueRecommendationOutput - The return type for the aiPoweredQueueRecommendation function.
 */

import { anthropic, DEFAULT_MODEL } from '@/ai/genkit';
import { z } from 'zod';

export const AIPoweredQueueRecommendationInputSchema = z.object({
  branchId: z.string().describe('The ID of the current branch.'),
  branchName: z.string().describe('The name of the current branch.'),
  currentQueueSize: z.number().describe('Current number of people in the queue.'),
  estimatedWaitMinutes: z.number().describe('Current estimated wait time in minutes.'),
  congestionLevel: z.enum(['LOW', 'MODERATE', 'HIGH']).describe('Current congestion level.'),
  historicalData: z.array(z.object({
    dayOfWeek: z.string().describe('Day of the week (e.g., Monday).'),
    hour: z.number().describe('Hour of the day (0-23).'),
    avgQueueSize: z.number().describe('Average queue size for this time slot.'),
  })).describe('Historical average queue sizes for different times and days of the week.'),
  nearbyBranches: z.array(z.object({
    branchId: z.string().describe('ID of the nearby branch.'),
    name: z.string().describe('Name of the nearby branch.'),
    currentQueueSize: z.number().describe('Current number of people in queue at this nearby branch.'),
    estimatedWaitMinutes: z.number().describe('Current estimated wait time in minutes at this nearby branch.'),
    congestionLevel: z.enum(['LOW', 'MODERATE', 'HIGH']).describe('Current congestion level at this nearby branch.'),
  })).describe('Data for nearby alternative branches.'),
});
export type AIPoweredQueueRecommendationInput = z.infer<typeof AIPoweredQueueRecommendationInputSchema>;

export const AIPoweredQueueRecommendationOutputSchema = z.object({
  recommendationSummary: z.string().describe('A concise summary of the recommendation.'),
  bestTimeToVisit: z.string().optional().describe('A specific time slot or general guidance on the best time to visit.'),
  alternativeBranches: z.array(z.object({
    branchId: z.string(),
    name: z.string(),
    currentQueueSize: z.number(),
    estimatedWaitMinutes: z.number(),
    congestionLevel: z.enum(['LOW', 'MODERATE', 'HIGH']),
  })).optional().describe('A list of less congested alternative branches.'),
});
export type AIPoweredQueueRecommendationOutput = z.infer<typeof AIPoweredQueueRecommendationOutputSchema>;

export async function aiPoweredQueueRecommendation(
  input: AIPoweredQueueRecommendationInput
): Promise<AIPoweredQueueRecommendationOutput> {
  const historicalSummary = input.historicalData
    .map(h => `  ${h.dayOfWeek} at ${h.hour}:00 — avg ${h.avgQueueSize} people`)
    .join('\n');

  const nearbySummary = input.nearbyBranches.length > 0
    ? input.nearbyBranches
        .map(b => `  ${b.name} (ID: ${b.branchId}): ${b.currentQueueSize} people, ${b.estimatedWaitMinutes} min wait, ${b.congestionLevel} congestion`)
        .join('\n')
    : '  No nearby branches provided.';

  const prompt = `You are an expert queue management advisor for South African government services. Your goal is to help citizens minimize their waiting time by providing smart recommendations based on real-time and historical queue data.

Current Branch Status:
Branch ID: ${input.branchId}
Branch Name: ${input.branchName}
Current Queue Size: ${input.currentQueueSize} people
Estimated Wait Time: ${input.estimatedWaitMinutes} minutes
Congestion Level: ${input.congestionLevel}

Historical Queue Data for ${input.branchName} (average queue size):
${historicalSummary}

Nearby Alternative Branches (current status):
${nearbySummary}

Based on the provided data:
1. Analyze the current congestion at ${input.branchName}.
2. If current congestion is HIGH or MODERATE, suggest a better time to visit using the historical data. Focus on periods with significantly lower average queue sizes.
3. If suitable alternative branches are available with significantly lower congestion, suggest them. Prioritize branches with LOW congestion.
4. If ${input.branchName} has LOW congestion, confirm it's a good time to visit.

Respond with ONLY a valid JSON object matching this exact structure (no markdown, no explanation):
{
  "recommendationSummary": "string — concise summary of whether now is a good time to visit",
  "bestTimeToVisit": "string — optional, only include if congestion is HIGH or MODERATE",
  "alternativeBranches": [
    {
      "branchId": "string",
      "name": "string",
      "currentQueueSize": number,
      "estimatedWaitMinutes": number,
      "congestionLevel": "LOW" | "MODERATE" | "HIGH"
    }
  ]
}
Omit "bestTimeToVisit" and "alternativeBranches" keys entirely if not applicable.`;

  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  const parsed = JSON.parse(text);
  return AIPoweredQueueRecommendationOutputSchema.parse(parsed);
}
