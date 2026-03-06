'use server';
/**
 * @fileOverview An AI assistant for summarizing employee notes.
 *
 * - summarizeEmployeeNotes - A function that handles the employee note summarization process.
 * - SummarizeEmployeeNotesInput - The input type for the summarizeEmployeeNotes function.
 * - SummarizeEmployeeNotesOutput - The return type for the summarizeEmployeeNotes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeEmployeeNotesInputSchema = z.object({
  notes: z.string().describe('The employee notes to be summarized.'),
});
export type SummarizeEmployeeNotesInput = z.infer<typeof SummarizeEmployeeNotesInputSchema>;

const SummarizeEmployeeNotesOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the employee notes.'),
});
export type SummarizeEmployeeNotesOutput = z.infer<typeof SummarizeEmployeeNotesOutputSchema>;

export async function summarizeEmployeeNotes(input: SummarizeEmployeeNotesInput): Promise<SummarizeEmployeeNotesOutput> {
  return summarizeEmployeeNotesFlow(input);
}

const summarizeEmployeeNotesPrompt = ai.definePrompt({
  name: 'summarizeEmployeeNotesPrompt',
  input: {schema: SummarizeEmployeeNotesInputSchema},
  output: {schema: SummarizeEmployeeNotesOutputSchema},
  prompt: `You are an AI assistant tasked with summarizing employee notes.
Your goal is to extract the key details and critical information from the provided notes, presenting them concisely.

Employee Notes:
{{{notes}}}

Provide a summary that highlights the most important aspects, potential issues, or relevant points for a payroll manager to review.`,
});

const summarizeEmployeeNotesFlow = ai.defineFlow(
  {
    name: 'summarizeEmployeeNotesFlow',
    inputSchema: SummarizeEmployeeNotesInputSchema,
    outputSchema: SummarizeEmployeeNotesOutputSchema,
  },
  async input => {
    const {output} = await summarizeEmployeeNotesPrompt(input);
    return output!;
  }
);
