import { PrismaService } from './prisma/prisma.service';
import { TaskService } from './task/task.service';

// @anthropic-ai/claude-agent-sdk ships ESM-only (no CJS build), which Jest's
// CommonJS transform can't parse from node_modules — mock it with the same
// shape `tool()` returns in production so handlers stay directly testable.
jest.mock('@anthropic-ai/claude-agent-sdk', () => ({
  tool: (
    name: string,
    description: string,
    inputSchema: unknown,
    handler: (...args: unknown[]) => unknown,
    extras?: { annotations?: unknown },
  ) => ({
    name,
    description,
    inputSchema,
    handler,
    annotations: extras?.annotations,
  }),
  createSdkMcpServer: (options: unknown) => options,
}));

import {
  createFindTasksTool,
  createUpdateMeetingTool,
  createUpsertTaskTool,
} from './meeting-tools';

describe('meeting-tools', () => {
  describe('find_tasks', () => {
    it('is read-only and returns matching tasks as JSON', async () => {
      const taskService = {
        search: jest.fn().mockResolvedValue([{ id: 'task-1' }]),
      };

      const findTasksTool = createFindTasksTool(
        taskService as unknown as TaskService,
      );
      const result = await findTasksTool.handler({ query: 'deck' }, {});

      expect(findTasksTool.annotations).toEqual({ readOnlyHint: true });
      expect(taskService.search).toHaveBeenCalledWith('deck');
      expect(result.content).toEqual([
        { type: 'text', text: JSON.stringify([{ id: 'task-1' }]) },
      ]);
    });
  });

  describe('upsert_task', () => {
    it('upserts a task and returns it as JSON', async () => {
      const taskService = {
        upsert: jest.fn().mockResolvedValue({ id: 'task-1', status: 'DONE' }),
      };

      const upsertTaskTool = createUpsertTaskTool(
        taskService as unknown as TaskService,
      );
      const result = await upsertTaskTool.handler(
        { title: 'Prepare deck', status: 'DONE', sourceMeetingId: 'meeting-1' },
        {},
      );

      expect(taskService.upsert).toHaveBeenCalledWith({
        title: 'Prepare deck',
        status: 'DONE',
        sourceMeetingId: 'meeting-1',
      });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: JSON.stringify({ id: 'task-1', status: 'DONE' }),
        },
      ]);
    });

    it('returns an error result when the upsert fails', async () => {
      const taskService = {
        upsert: jest.fn().mockRejectedValue(new Error('constraint violated')),
      } as unknown as TaskService;

      const upsertTaskTool = createUpsertTaskTool(taskService);
      const result = await upsertTaskTool.handler(
        { title: 'Prepare deck', status: 'OPEN', sourceMeetingId: 'meeting-1' },
        {},
      );

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: 'text', text: 'constraint violated' },
      ]);
    });
  });

  describe('update_meeting', () => {
    it('writes summary and decisions onto the latest meeting file summary', async () => {
      const prisma = {
        meetingFile: {
          findFirst: jest.fn().mockResolvedValue({ id: 'file-1' }),
        },
        meetingFileSummary: {
          upsert: jest.fn().mockResolvedValue({ id: 'summary-1' }),
        },
      };

      const updateMeetingTool = createUpdateMeetingTool(
        prisma as unknown as PrismaService,
      );
      const result = await updateMeetingTool.handler(
        {
          meetingId: 'meeting-1',
          summary: 'Discussed the roadmap.',
          decisions: ['Ship in Q3'],
        },
        {},
      );

      expect(prisma.meetingFile.findFirst).toHaveBeenCalledWith({
        where: { meetingId: 'meeting-1' },
        orderBy: { uploadedAt: 'desc' },
      });
      expect(prisma.meetingFileSummary.upsert).toHaveBeenCalledWith({
        where: { meetingFileId: 'file-1' },
        create: {
          meetingFileId: 'file-1',
          status: 'COMPLETED',
          summary: 'Discussed the roadmap.',
          decisions: ['Ship in Q3'],
        },
        update: {
          status: 'COMPLETED',
          summary: 'Discussed the roadmap.',
          decisions: ['Ship in Q3'],
        },
      });
      expect(result.content).toEqual([
        { type: 'text', text: JSON.stringify({ id: 'summary-1' }) },
      ]);
    });

    it('returns an error result when the meeting has no files', async () => {
      const prisma = {
        meetingFile: { findFirst: jest.fn().mockResolvedValue(null) },
        meetingFileSummary: { upsert: jest.fn() },
      };

      const updateMeetingTool = createUpdateMeetingTool(
        prisma as unknown as PrismaService,
      );
      const result = await updateMeetingTool.handler(
        { meetingId: 'meeting-1', summary: 'x', decisions: [] },
        {},
      );

      expect(result.isError).toBe(true);
      expect(prisma.meetingFileSummary.upsert).not.toHaveBeenCalled();
    });
  });
});
