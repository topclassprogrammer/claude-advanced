import { PrismaService } from '../prisma/prisma.service';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let service: TaskService;
  let prisma: {
    task: { findMany: jest.Mock; upsert: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      task: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ id: 'task-1' }),
      },
    };
    service = new TaskService(prisma as unknown as PrismaService);
  });

  describe('search', () => {
    it('searches by case-insensitive title match, newest first', async () => {
      await service.search('  Prepare deck  ');

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { title: { contains: 'Prepare deck', mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });

    it('returns an empty list without querying the database for a blank query', async () => {
      const result = await service.search('   ');

      expect(result).toEqual([]);
      expect(prisma.task.findMany).not.toHaveBeenCalled();
    });
  });

  describe('upsert', () => {
    it('upserts on the (sourceMeetingId, title) unique key', async () => {
      await service.upsert({
        title: 'Prepare deck',
        sourceMeetingId: 'meeting-1',
        status: 'DONE',
      });

      expect(prisma.task.upsert).toHaveBeenCalledWith({
        where: {
          sourceMeetingId_title: {
            sourceMeetingId: 'meeting-1',
            title: 'Prepare deck',
          },
        },
        create: {
          title: 'Prepare deck',
          sourceMeetingId: 'meeting-1',
          status: 'DONE',
        },
        update: { status: 'DONE' },
      });
    });
  });
});
