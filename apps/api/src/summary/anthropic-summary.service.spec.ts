interface ParseRequest {
  model: string;
  system: string;
  messages: { role: string; content: string }[];
}

const parseMock = jest.fn<
  Promise<{ parsed_output: unknown }>,
  [ParseRequest]
>();
const anthropicConstructorMock = jest.fn<
  void,
  [{ apiKey: string; timeout: number }]
>();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation((options: { apiKey: string; timeout: number }) => {
      anthropicConstructorMock(options);
      return { messages: { parse: parseMock } };
    }),
}));

import { ConfigService } from '@nestjs/config';
import { AnthropicSummaryService } from './anthropic-summary.service';
import {
  CLAUDE_SUMMARY_MODEL,
  MAX_TRANSCRIPT_CHARS,
  SUMMARY_SYSTEM_PROMPT,
} from './summary.constants';

const buildConfigService = (apiKey: string | undefined): ConfigService =>
  ({
    get: jest.fn().mockReturnValue(apiKey),
  }) as unknown as ConfigService;

describe('AnthropicSummaryService', () => {
  let service: AnthropicSummaryService;

  beforeEach(() => {
    parseMock.mockReset();
    anthropicConstructorMock.mockClear();
    service = new AnthropicSummaryService(buildConfigService('test-api-key'));
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

  it('throws when the response has an empty summary', async () => {
    parseMock.mockResolvedValue({
      parsed_output: { summary: '', actionItems: [], decisions: [] },
    });

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

  it('propagates timeouts from the Claude API call', async () => {
    parseMock.mockRejectedValue(new Error('Request timed out'));

    await expect(service.generateSummary('transcript')).rejects.toThrow(
      /timed out/i,
    );
  });

  it('rejects with a clear error and never calls the API when the API key is not configured', async () => {
    service = new AnthropicSummaryService(buildConfigService(undefined));

    await expect(service.generateSummary('transcript')).rejects.toThrow(
      /ANTHROPIC_API_KEY/,
    );
    expect(parseMock).not.toHaveBeenCalled();
  });

  it('rejects with a clear error when the API key is blank', async () => {
    service = new AnthropicSummaryService(buildConfigService('   '));

    await expect(service.generateSummary('transcript')).rejects.toThrow(
      /ANTHROPIC_API_KEY/,
    );
  });

  it('does not construct the Anthropic client until the first call', () => {
    expect(anthropicConstructorMock).not.toHaveBeenCalled();
  });

  it('configures an explicit request timeout so a hung call fails instead of blocking forever', async () => {
    parseMock.mockResolvedValue({
      parsed_output: { summary: 'ok', actionItems: [], decisions: [] },
    });

    await service.generateSummary('transcript');

    expect(anthropicConstructorMock).toHaveBeenCalledTimes(1);
    const options = anthropicConstructorMock.mock.calls[0][0];
    expect(options.apiKey).toBe('test-api-key');
    expect(typeof options.timeout).toBe('number');
  });

  it('truncates a transcript longer than the configured maximum before sending it', async () => {
    parseMock.mockResolvedValue({
      parsed_output: { summary: 'ok', actionItems: [], decisions: [] },
    });
    const oversizedTranscript = 'a'.repeat(MAX_TRANSCRIPT_CHARS + 5000);

    await service.generateSummary(oversizedTranscript);

    const call = parseMock.mock.calls[0][0];
    const transcriptSection = call.messages[0].content;
    expect(transcriptSection.length).toBeLessThan(
      oversizedTranscript.length + 200,
    );
    expect(transcriptSection).toContain('обрезан');
  });

  it('does not truncate a transcript within the configured maximum', async () => {
    parseMock.mockResolvedValue({
      parsed_output: { summary: 'ok', actionItems: [], decisions: [] },
    });
    const transcript = 'short transcript';

    await service.generateSummary(transcript);

    const call = parseMock.mock.calls[0][0];
    expect(call.messages[0].content).toContain(transcript);
    expect(call.messages[0].content).not.toContain('обрезан');
  });
});
