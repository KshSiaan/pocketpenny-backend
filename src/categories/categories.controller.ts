import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  Put,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CategoriesService } from './categories.service.js';
import {
  type CategoryDto,
  type CategoryIcon,
  CategoryBodySchema,
  CategorySchema,
} from './validator.pipe.js';
import { ZodValidationPipe } from '../lib/zod-validation-pipe.js';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) { }

  @Get()
  @AllowAnonymous()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':slug')
  @AllowAnonymous()
  findOne(@Param('slug') slug: string) {
    return this.categoriesService.findOne(slug);
  }

  @Post()
  @UseInterceptors(FileInterceptor('icon'))
  createCategory(
    @UploadedFile(new ZodValidationPipe(CategorySchema.shape.icon))
    icon: CategoryIcon,
    @Body(new ZodValidationPipe(CategoryBodySchema))
    body: Omit<CategoryDto, 'icon'>,
  ) {
    return this.categoriesService.createCategory({ ...body, icon });
  }

  @Delete(':id')
  deleteCategory(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('icon'))
  updateCategory(
    @Param('id') id: string,
    @UploadedFile(new ZodValidationPipe(CategorySchema.shape.icon))
    icon: CategoryIcon,
    @Body(new ZodValidationPipe(CategoryBodySchema))
    body: Omit<CategoryDto, 'icon'>,
  ) {
    return this.categoriesService.updateCategory(id, { ...body, icon });
  }


}
