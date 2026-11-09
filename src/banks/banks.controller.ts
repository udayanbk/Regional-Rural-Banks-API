import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from "@nestjs/common";
import { BanksService } from "./banks.service.js";

@Controller("banks")
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Get()
  getBanks() {
    return this.banksService.getBanks();
  }

  @Get(":bankId/branches")
  getBranches(@Param("bankId", ParseIntPipe) bankId: number) {
    return this.banksService.getBranches(bankId);
  }

  @Get("branches/:branchId")
  getBranchDetails(
    @Param("branchId", ParseIntPipe) branchId: number,
  ) {
    return this.banksService.getBranchDetails(branchId);
  }
}