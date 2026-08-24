import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  ClaudeSummaryService,
  GeneratedSummary,
} from './claude-summary.service';
import { CLAUDE_SUMMARY_MODEL, SUMMARY_SYSTEM_PROMPT } from './summary.constants';

const SummaryOutputSchema = z.object({
  summary: z.string(),
  actionItems: z.array(
    z.object({
      text: z.string(),
      assignee: z.string().nullable(),
    }),
  ),
  decisions: z.array(z.string()),
});

@Injectable()
export class AnthropicSummaryService implements ClaudeSummaryService {
  private readonly client = new Anthropic();

  async generateSummary(transcriptText: string): Promise<GeneratedSummary> {
    const response = await this.client.messages.parse({
      model: CLAUDE_SUMMARY_MODEL,
      max_tokens: 4096,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcriptText }],
      output_config: { format: zodOutputFormat(SummaryOutputSchema) },
    });

    if (!response.parsed_output) {
      throw new Error('Claude summary response failed schema validation');
    }

    return response.parsed_output;
  }
}
