import { Module } from '@nestjs/common';
import { RrbUsersController } from './rrb-users.controller.js';
import { RrbUsersService } from './rrb-users.service.js';

@Module({
  controllers: [RrbUsersController],
  providers: [RrbUsersService],
  exports: [RrbUsersService],
})
export class RrbUsersModule {}