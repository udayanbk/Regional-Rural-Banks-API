
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { RrbUsersService } from './rrb-users.service.js';

@Controller('rrb-users')
export class RrbUsersController {
  constructor(private readonly rrbUsersService: RrbUsersService) {}

  @Post('upload/bank-branches')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async uploadBankBranches(@UploadedFile() file?: Express.Multer.File) {
    return this.rrbUsersService.uploadBankBranches(file);
  }

  @Post('upload/users')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async uploadUsers(@UploadedFile() file?: Express.Multer.File) {
    return this.rrbUsersService.uploadUsers(file);
  }
}
