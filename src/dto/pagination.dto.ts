import {
    IsArray,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class PaginationDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit: number = 10;

    @IsOptional()
    @IsString()
    sort?: string;

    @IsOptional()
    @Transform(({ value }) =>
        typeof value === 'string' ? value.split(',').filter(Boolean) : [],
    )
    @IsArray()
    @IsString({ each: true })
    include?: string[];

    [key: string]: any;
}
