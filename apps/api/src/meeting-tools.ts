import { Logger } from '@nestjs/common';
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { McpSdkServerConfigWithInstance } from '@anthropic-ai/claude-agent-sdk';
import type { SummaryStatus, TaskStatus } from '../generated/prisma/client';
import { PrismaService } from './prisma/prisma.service';
import { TaskService } from './task/task.service';

const logger = new Logger('MeetingTools');

const TASK_STATUS_VALUES: [TaskStatus, ...TaskStatus[]] = [
  'OPEN',
  'IN_PROGRESS',
  'DONE',
];

const jsonResult = (
  payload: unknown,
): { content: [{ type: 'text'; text: string }] } => ({
  content: [{ type: 'text', text: JSON.stringify(payload) }],
});

const errorResult = (
  message: string,
): {
  content: [{ type: 'text'; text: string }];
  isError: true;
} => ({
  content: [{ type: 'text', text: message }],
  isError: true,
});

export function createFindTasksTool(taskService: TaskService) {
  return tool(
    'find_tasks',
    'Ищет похожие/совпадающие задачи по тексту заголовка',
    { query: z.string().describe('Поисковый текст задачи') },
    async ({ query }) => {
      const matchingTasks = await taskService.search(query);
      return jsonResult(matchingTasks);
    },
    { annotations: { readOnlyHint: true } },
  );
}

export function createUpsertTaskTool(taskService: TaskService) {
  return tool(
    'upsert_task',
    'Создаёт задачу или обновляет статус существующей задачи с тем же заголовком в рамках встречи',
    {
      title: z.string().describe('Заголовок задачи'),
      status: z.enum(TASK_STATUS_VALUES).describe('Статус задачи'),
      sourceMeetingId: z
        .string()
        .describe('Идентификатор встречи-источника задачи'),
    },
    async ({ title, status, sourceMeetingId }) => {
      try {
        const upsertedTask = await taskService.upsert({
          title,
          status,
          sourceMeetingId,
        });
        return jsonResult(upsertedTask);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to upsert task "${title}": ${errorMessage}`);
        return errorResult(errorMessage);
      }
    },
  );
}

export function createUpdateMeetingTool(prisma: PrismaService) {
  return tool(
    'update_meeting',
    'Записывает саммари и принятые решения по встрече',
    {
      meetingId: z.string().describe('Идентификатор встречи'),
      summary: z.string().describe('Текст саммари встречи'),
      decisions: z.array(z.string()).describe('Список принятых решений'),
    },
    async ({ meetingId, summary, decisions }) => {
      const latestMeetingFile = await prisma.meetingFile.findFirst({
        where: { meetingId },
        orderBy: { uploadedAt: 'desc' },
      });

      if (!latestMeetingFile) {
        const errorMessage = `No files found for meeting ${meetingId}`;
        logger.error(errorMessage);
        return errorResult(errorMessage);
      }

      const completedStatus: SummaryStatus = 'COMPLETED';
      const updatedSummary = await prisma.meetingFileSummary.upsert({
        where: { meetingFileId: latestMeetingFile.id },
        create: {
          meetingFileId: latestMeetingFile.id,
          status: completedStatus,
          summary,
          decisions,
        },
        update: { status: completedStatus, summary, decisions },
      });

      return jsonResult(updatedSummary);
    },
  );
}

export function createMeetingToolServer(
  prisma: PrismaService,
  taskService: TaskService,
): McpSdkServerConfigWithInstance {
  return createSdkMcpServer({
    name: 'meeting',
    tools: [
      createFindTasksTool(taskService),
      createUpsertTaskTool(taskService),
      createUpdateMeetingTool(prisma),
    ],
  });
}
