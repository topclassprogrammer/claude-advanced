import { TaskStatus } from '../../generated/prisma/client';

export interface UpsertTaskParams {
  title: string;
  sourceMeetingId: string;
  status?: TaskStatus;
}
