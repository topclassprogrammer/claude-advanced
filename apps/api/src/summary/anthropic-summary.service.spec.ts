const parseMock = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { parse: parseMock },
  })),
}));

import { AnthropicSummaryService } from './anthropic-summary.service';

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
