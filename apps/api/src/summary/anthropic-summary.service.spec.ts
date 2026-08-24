interface ParseRequest {
  model: string;
  system: string;
  messages: { role: string; content: string }[];
}

const parseMock = jest.fn<
  Promise<{ parsed_output: unknown }>,
  [ParseRequest]
>();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { parse: parseMock },
  })),
}));

import { AnthropicSummaryService } from './anthropic-summary.service';
import {
  CLAUDE_SUMMARY_MODEL,
  SUMMARY_SYSTEM_PROMPT,
} from './summary.constants';

describe('AnthropicSummaryService', () => {
  let service: AnthropicSummaryService;

  beforeEach(() => {
    parseMock.mockReset();
    service = new AnthropicSummaryService();
  });

  it('returns the parsed summary, action items and decisions on success', async () => {
    parseMock.mockResolvedValue({
      parsed_output: {
        summary: 'The team discussed the roadmap.',
        actionItems: [
          { text: 'Prepare the deck', assignee: 'Alice' },
          { text: 'Book the venue', assignee: null },
        ],
        decisions: ['Ship in Q3'],
      },
    });

    const result = await service.generateSummary('this is the transcript');

    expect(result).toEqual({
      summary: 'The team discussed the roadmap.',
      actionItems: [
        { text: 'Prepare the deck', assignee: 'Alice' },
        { text: 'Book the venue', assignee: null },
      ],
      decisions: ['Ship in Q3'],
    });
    const call = parseMock.mock.calls[0][0];
    expect(call.model).toBe(CLAUDE_SUMMARY_MODEL);
    expect(call.system).toBe(SUMMARY_SYSTEM_PROMPT);
    expect(call.messages).toHaveLength(1);
    expect(call.messages[0].role).toBe('user');
    expect(call.messages[0].content).toContain('this is the transcript');
  });

  it('throws when the response fails schema validation', async () => {
    parseMock.mockResolvedValue({ parsed_output: null });

    await expect(service.generateSummary('transcript')).rejects.toThrow(
      /schema/i,
    );
  });

  it('propagates errors from the Claude API call', async () => {
    parseMock.mockRejectedValue(new Error('rate limited'));

    await expect(service.generateSummary('transcript')).rejects.toThrow(
      'rate limited',
    );
  });
});
