import { Type } from '@nestjs/common';
import { ClassConstructor } from 'class-transformer';

export interface CrudGuards {
    create?: MethodDecorator[];
    update?: MethodDecorator[];
    delete?: MethodDecorator[];
    findOne?: MethodDecorator[];
    findAll?: MethodDecorator[];
}

export interface CrudOptions<T, R> {
    CreateDto?: Type<any>;
    UpdateDto?: Type<any>;
    ResponseDto?: ClassConstructor<R>;
    allowedRelationsFindOne?: (keyof T & string)[];
    allowedRelationsFindAll?: (keyof T & string)[];
    guards?: CrudGuards;
    createInterceptor?: any;
    createFileField?: string;
    serializationGroups?: string[];
    softDelete?: boolean;
}