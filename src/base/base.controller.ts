import { applyDecorators, BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, Type, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { validate } from 'class-validator';
import { CrudOptions } from 'src/interfaces/crud-options.interface';
import { BaseService } from './base.service';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { maybeDecorators } from 'src/utils/decorator-helper';
import { maybeInterceptor } from 'src/utils/interceptor-helper';
import { ApiResponseDto } from 'src/dto/api-response.dto';
import { plainToInstance } from 'class-transformer';
import { successResponse } from 'src/utils/success-response.util';
import { PaginationDto } from 'src/dto/pagination.dto';
import { applyIncludes } from 'src/utils/apply-includes';
import { FindManyOptions } from 'typeorm';
import { IncludeQuery } from 'src/dto/include-query.dto';

function dtoProperties(dto: Type<any>): Record<string, any> {
  const instance = new dto();
  const out: Record<string, any> = {};
  Object.keys(instance).forEach((k) => (out[k] = { type: 'string' }));
  return out;
}

export function BaseController<T extends object, TResponseDto extends object>(
  entityName: string,
  opts?: CrudOptions<T, TResponseDto>,
) {
  const {
    CreateDto,
    UpdateDto,
    ResponseDto,
    allowedRelationsFindOne,
    allowedRelationsFindAll,
    guards,
    createInterceptor,
    createFileField,
    serializationGroups,
    softDelete = true,
  } = opts ?? {};

  const parseSort = (sort?: string): { [key: string]: 'ASC' | 'DESC' } => {
    if (!sort) return {}
    const [field, direction] = sort.split(':')
    return { [field]: direction === 'desc' ? 'DESC' : 'ASC' }
  }



  const buildCreateDecorators = (opts: CrudOptions<T, TResponseDto>) => {
    const {
      CreateDto,
      createInterceptor,
      createFileField = 'file',
    } = opts ?? {};
    const decorators: MethodDecorator[] = [
      ApiOperation({ summary: `Create a new ${entityName}` }),
      maybeDecorators(...(opts?.guards?.create ?? [])),
      ApiResponse({ status: 201, type: ApiResponseDto }),
    ];

    if (createInterceptor) {
      decorators.push(
        UseInterceptors(maybeInterceptor(createInterceptor)),
        ApiConsumes('multipart/form-data'),
        ApiBody({
          schema: {
            type: 'object',
            properties: {
              [createFileField]: { type: 'string', format: 'binary' },
              ...(CreateDto ? dtoProperties(CreateDto) : {}),
            },
          },
        }),
      );
    } else {
      if (CreateDto) {
        decorators.push(ApiBody({ type: CreateDto }));
      }
    }
    return decorators;
  }

  abstract class BaseControllerHost {
    constructor(readonly service: BaseService<T>) { }

    @Post()
    @ApiOperation({ summary: `Create a new ${entityName}` })
    @ApiBody({ type: CreateDto })
    @ApiResponse({ status: 201, type: ApiResponseDto })
    @maybeDecorators(...(opts?.guards?.create ?? []))
    @applyDecorators(...buildCreateDecorators(opts || {}))
    async create(@Body() createDto: any, @Req() request: Request, @UploadedFiles() files?: Express.Multer.File[]) {
      const entity = CreateDto ? plainToInstance(CreateDto, createDto) : createDto

      if (CreateDto) {
        const errors = await validate(entity);
        if (errors.length > 0) {
          throw new BadRequestException(errors);
        }
      }

      if (files) {
        const data = await this.service.create(entity, undefined, files);
        return successResponse(
          data,
          `${entityName} created successfully`,
          201,
          request.url,
          ResponseDto,
          false,
          serializationGroups,
        );
      } else {
        const data = await this.service.create(entity);
        return successResponse(
          data,
          `${entityName} created successfully`,
          201,
          request.url,
          ResponseDto,
          false,
          serializationGroups,
        );
      }

    }

    @Get()
    @ApiOperation({ summary: `Get all ${entityName}s with pagination` })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'sort', required: false, example: 'created_at:desc' })
    @ApiResponse({ status: 200, type: ApiResponseDto })
    @maybeDecorators(...(opts?.guards?.findAll ?? []))
    async findAll(@Query() paginationDto: PaginationDto, @Req() req: Request) {
      const { page = 1, limit = 10, sort, include, ...filters } = paginationDto
      const includeKeys = include as (keyof T & string)[] | undefined
      if (includeKeys?.length) {
        const invalid = includeKeys.filter(
          (r) => !allowedRelationsFindAll?.includes(r)
        )
        if (invalid.length) {
          throw new BadRequestException(
            `Invalid relations: ${invalid.join(', ')}. Allowed: ${allowedRelationsFindAll?.join(', ')}`,)
        }
      }

      const dbOptions = applyIncludes({
        where: filters as any,
        order: parseSort(sort),
      } as FindManyOptions<T>,
        include
      )

      const result = await this.service.paginate({
        ...dbOptions,
        page,
        limit: Math.min(limit, 100)
      })

      return successResponse(
        result,
        `${entityName} retrieved successfully`,
        200,
        req.url,
        ResponseDto,
        false,
        serializationGroups,
      );

    }

    @Get(':id')
    @ApiOperation({ summary: `Get ${entityName} by ID` })
    @ApiParam({ name: 'id', type: Number })
    @ApiResponse({ status: 200, type: ApiResponseDto })
    @maybeDecorators(...(opts?.guards?.findOne ?? []))
    async findOne(
      @Param('id', ParseIntPipe) id: number,
      @Req() req: Request,
      @Query() includeQuery: IncludeQuery<T>,
    ) {
      const { include } = includeQuery;

      if (include?.length) {
        const invalid = include.filter(
          (r) => !allowedRelationsFindOne?.includes(r),
        );
        if (invalid.length)
          throw new BadRequestException(
            `Invalid relations: ${invalid.join(', ')}. Allowed: ${allowedRelationsFindOne?.join(', ')}`,
          );
      }

      const options = applyIncludes({ where: { id } as any }, include);
      const data = await this.service.findOne(options);

      return successResponse(
        data,
        `${entityName} retrieved successfully`,
        200,
        req.url,
        ResponseDto,
        false,
        serializationGroups,
      );
    }


    @Patch(':id')
    @ApiOperation({ summary: `Update ${entityName} by ID` })
    @ApiParam({ name: 'id', type: Number })
    @ApiBody({ type: UpdateDto })
    @ApiResponse({ status: 200, type: ApiResponseDto })
    @maybeDecorators(...(opts?.guards?.update ?? []))
    async update(@Param('id', ParseIntPipe) id: number,
      @Body() updateDto: any,
      @Req() req: Request
    ) {
      const entity = UpdateDto ? plainToInstance(UpdateDto, updateDto) : updateDto

      if (UpdateDto) {
        const errors = await validate(entity);
        if (errors.length > 0) {
          throw new BadRequestException(errors);
        }
      }

      const data = await this.service.update({ id }, entity)
      return successResponse(
        data,
        `${entityName} updated successfully`,
        200,
        req.url,
      );
    }


    @Delete(':id')
    @ApiOperation({ summary: `Delete ${entityName} by ID` })
    @ApiParam({ name: 'id', type: Number })
    @ApiResponse({ status: 200, type: ApiResponseDto })
    @maybeDecorators(...(opts?.guards?.delete ?? []))
    async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
      await this.service.delete(id, softDelete)
      return successResponse(
        { deleted: true, id },
        `${entityName} deleted successfully`,
        200,
        req.url,
      );
    }


  }
  const ControllerDecorator = (path?: string) =>
    applyDecorators(Controller(path || `${entityName.toLowerCase()}s`));

  const Base = BaseControllerHost;

  return { Controller: ControllerDecorator, Base };

}
