import { AdminonlyGuard } from './adminonly.guard.js';

describe('AdminonlyGuard', () => {
  it('should be defined', () => {
    expect(new AdminonlyGuard()).toBeDefined();
  });
});
