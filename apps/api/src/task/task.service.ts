import { Injectable } from '@nestjs/common';
import { Task } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_TASK_SEARCH_RESULTS } from './task.constants';
import { UpsertTaskParams } from './task.types';

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string): Promise<Task[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    return this.prisma.task.findMany({
      where: { title: { contains: trimmedQuery, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      take: MAX_TASK_SEARCH_RESULTS,
    });
  }

  async upsert(params: UpsertTaskParams): Promise<Task> {
    const { title, sourceMeetingId, status } = params;

    return this.prisma.task.upsert({
      where: { sourceMeetingId_title: { sourceMeetingId, title } },
      create: { title, sourceMeetingId, status },
      update: { status },
    });
  }
}
