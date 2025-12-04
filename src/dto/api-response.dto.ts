import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
    @ApiProperty({ description: 'Success flag', example: true })
    @Expose()
    success: boolean;

    @ApiProperty({ description: 'HTTP status code', example: 200 })
    @Expose()
    statusCode: number;

    @ApiProperty({
        description: 'Human readable message',
        example: 'Created successfully',
    })
    @Expose()
    message: string;

    @ApiProperty({
        description: 'Current timestamp',
        example: '2025-04-05T10:00:00.000Z',
    })
    @Expose()
    timestamp: string;

    @ApiProperty({ description: 'Request path', example: '/users' })
    @Expose()
    path: string;


    @ApiProperty({ description: 'Response payload' })
    @Expose()
    @Type(() => Object)
    data: T;

    constructor(partial: Partial<ApiResponseDto<T>>) {
        Object.assign(this, {
            success: true,
            timestamp: new Date().toISOString(),
            ...partial,
        });
    }
}
