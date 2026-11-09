
import { Module } from '@nestjs/common';
import { BranchMasterController } from './branch-master.controller.js';
import { BranchMasterService } from './branch-master.service.js';

@Module({
  controllers: [BranchMasterController],
  providers: [BranchMasterService],
})
export class BranchMasterModule {}
