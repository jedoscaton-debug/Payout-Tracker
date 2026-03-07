
'use server';
/**
 * @fileOverview An AI flow for extracting settlement details from RXO screenshots.
 *
 * - analyzeRXOSettlement - A function that handles the RXO image scanning process.
 * - AnalyzeRXOInput - The input type for the analyzeRXOSettlement function.
 * - AnalyzeRXOOutput - The return type for the analyzeRXOSettlement function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RXORouteExtractionSchema = z.object({
  routeId: z.string().describe('The full RXO Route ID (e.g. LMH__BWI_02152026_A01_EV)'),
  market: z.string().describe('The market name (e.g. LMH Beltsville)'),
  routeDate: z.string().describe('The date of the route in YYYY-MM-DD format'),
  routeMiles: z.number().describe('The mileage recorded by RXO'),
  stopCount: z.number().describe('The number of stops recorded by RXO'),
  settlementAmount: z.number().describe('The actual amount paid by RXO for this route'),
});

const AnalyzeRXOInputSchema = z.object({
  photoDataUri: z.string().describe("A photo of the RXO Settlement report, as a data URI."),
});
export type AnalyzeRXOInput = z.infer<typeof AnalyzeRXOInputSchema>;

const AnalyzeRXOOutputSchema = z.object({
  extractedRoutes: z.array(RXORouteExtractionSchema).describe('The list of routes extracted from the screenshot.'),
  totalPay: z.number().describe('The total settlement pay summed from extracted items.'),
});
export type AnalyzeRXOOutput = z.infer<typeof AnalyzeRXOOutputSchema>;

export async function analyzeRXOSettlement(input: AnalyzeRXOInput): Promise<AnalyzeRXOOutput> {
  return analyzeRXOSettlementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeRXOSettlementPrompt',
  input: {schema: AnalyzeRXOInputSchema},
  output: {schema: AnalyzeRXOOutputSchema},
  prompt: `You are an expert logistics auditor. Your task is to scan the provided screenshot of an RXO Settlement report and extract individual route data.

Identify the following fields for every row in the report:
1. Route ID (Look for long strings starting with LMH or DMPEV)
2. Market (e.g. BWI, Beltsville, etc.)
3. Route Date (Convert to YYYY-MM-DD)
4. Route Miles
5. Stop Count
6. Settlement Amount (The payout for that specific route)

RXO ROUTE ID PATTERN MATCHING:
The Route ID often contains a date string in MMDDYYYY format.
Example: LMH__BWI_02152026_A01_EV
- Route Code: A01_EV
- Date: 02152026 (February 15, 2026)

Make sure to extract the FULL Route ID string.

Photo: {{media url=photoDataUri}}`,
});

const analyzeRXOSettlementFlow = ai.defineFlow(
  {
    name: 'analyzeRXOSettlementFlow',
    inputSchema: AnalyzeRXOInputSchema,
    outputSchema: AnalyzeRXOOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
