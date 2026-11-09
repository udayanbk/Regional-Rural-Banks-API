
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { BranchMasterService } from './branch-master.service.js';

@Controller('branch-master')
export class BranchMasterController {
  constructor(
    private readonly branchMasterService: BranchMasterService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    return this.branchMasterService.upload(file);
  }
}
