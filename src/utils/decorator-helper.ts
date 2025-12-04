import { applyDecorators } from '@nestjs/common';

export const maybeDecorators = (...decs: MethodDecorator[]) =>
    decs?.length ? applyDecorators(...decs) : applyDecorators(); 
