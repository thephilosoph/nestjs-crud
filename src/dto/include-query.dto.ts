import { IsOptional, IsString, IsIn, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export type AllowedRelation<Entity> = keyof Entity & string;

export class IncludeQuery<Entity> {
    @ApiProperty({
        description: 'Comma-separated list of relations to include',
        required: false,
        type: String,
        example: 'posts,tags',
    })
    @IsOptional()
    @Transform(({ value }) =>
        typeof value === 'string' ? value.split(',').filter(Boolean) : [],
    )
    @IsArray()
    @IsString({ each: true })
    include?: AllowedRelation<Entity>[];
}
