import { Body, Controller, Post } from "@nestjs/common";
import { RegistrationsService } from "./registrations.service.js";

@Controller("registrations")
export class RegistrationsController {
  constructor(
    private readonly registrationsService: RegistrationsService,
  ) {}

  @Post()
  create(@Body() body: any) {
    return this.registrationsService.create(body);
  }
}