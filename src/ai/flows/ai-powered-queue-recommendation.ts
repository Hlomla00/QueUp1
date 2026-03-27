'use server';
/**
 * @fileOverview An AI agent that provides queue recommendations for government branches.
 *
 * - aiPoweredQueueRecommendation - A function that handles the queue recommendation process.
 * - AIPoweredQueueRecommendationInput - The input type for the aiPoweredQueueRecommendation function.
 * - AIPoweredQueueRecommendationOutput - The return type for the aiPoweredQueueRecommendation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIPoweredQueueRecommendationInputSchema = z.object({
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

const AIPoweredQueueRecommendationOutputSchema = z.object({
  recommendationSummary: z.string().describe('A concise summary of the recommendation, indicating if it is a good time to visit or if alternatives are better.'),
  bestTimeToVisit: z.string().optional().describe('A specific time slot or general guidance on the best time to visit the current branch, e.g., "Wednesday afternoon (14:00-16:00)" or "Later today (after 15:00)".'),
  alternativeBranches: z.array(z.object({
    branchId: z.string().describe('ID of the alternative branch.'),
    name: z.string().describe('Name of the alternative branch.'),
    currentQueueSize: z.number().describe('Current number of people in queue at the alternative branch.'),
    estimatedWaitMinutes: z.number().describe('Current estimated wait time in minutes at the alternative branch.'),
    congestionLevel: z.enum(['LOW', 'MODERATE', 'HIGH']).describe('Current congestion level at the alternative branch.'),
  })).optional().describe('A list of less congested alternative branches with their current wait times.'),
});
export type AIPoweredQueueRecommendationOutput = z.infer<typeof AIPoweredQueueRecommendationOutputSchema>;

export async function aiPoweredQueueRecommendation(input: AIPoweredQueueRecommendationInput): Promise<AIPoweredQueueRecommendationOutput> {
  return aiPoweredQueueRecommendationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiPoweredQueueRecommendationPrompt',
  input: {schema: AIPoweredQueueRecommendationInputSchema},
  output: {schema: AIPoweredQueueRecommendationOutputSchema},
  prompt: `You are an expert queue management advisor for South African government services. Your goal is to help citizens minimize their waiting time by providing smart recommendations based on real-time and historical queue data.\n\nCurrent Branch Status:\nBranch ID: {{{branchId}}}\nBranch Name: {{{branchName}}}\nCurrent Queue Size: {{{currentQueueSize}}} people\nEstimated Wait Time: {{{estimatedWaitMinutes}}} minutes\nCongestion Level: {{{congestionLevel}}}\n\nHistorical Queue Data for {{{branchName}}} (average queue size):\n{{#each historicalData}}\n  Day: {{{dayOfWeek}}}, Hour: {{{hour}}}: {{{avgQueueSize}}} people\n{{/each}}\n\nNearby Alternative Branches (current status):\n{{#if nearbyBranches}}\n  {{#each nearbyBranches}}\n    Branch ID: {{{branchId}}}, Name: {{{name}}}, Queue: {{{currentQueueSize}}} people, Wait: {{{estimatedWaitMinutes}}} minutes, Congestion: {{{congestionLevel}}}\n  {{/each}}\n{{else}}\n  No nearby branches provided.\n{{/if}}\n\nBased on the provided data, provide a recommendation to the user.\n1.  Analyze the current congestion at {{{branchName}}}.\n2.  If current congestion is high or moderate, suggest a better time to visit {{{branchName}}} using the historical data. Focus on periods with significantly lower average queue sizes.\n3.  If suitable alternative branches are available with significantly lower congestion levels, suggest them to the user. Prioritize branches with LOW congestion.\n4.  If {{{branchName}}} has low congestion, confirm it's a good time to visit.\n\nProvide your output in the exact JSON format as described by the output schema, including 'recommendationSummary', 'bestTimeToVisit' (if applicable), and 'alternativeBranches' (if applicable).\n`,
});

const aiPoweredQueueRecommendationFlow = ai.defineFlow(
  {
    name: 'aiPoweredQueueRecommendationFlow',
    inputSchema: AIPoweredQueueRecommendationInputSchema,
    outputSchema: AIPoweredQueueRecommendationOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
