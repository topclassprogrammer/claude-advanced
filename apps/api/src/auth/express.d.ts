import { AuthenticatedUser } from './jwt-auth.guard';

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
