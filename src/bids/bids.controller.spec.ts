import { Test, TestingModule } from '@nestjs/testing';
import { BidsController } from './bids.controller.js';
import { BidsService } from './bids.service.js';

describe('BidsController', () => {
  let controller: BidsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BidsController],
      providers: [BidsService],
    }).compile();

    controller = module.get<BidsController>(BidsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
