import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Column, Entity, PrimaryGeneratedColumn, Repository, DataSource, DeleteDateColumn } from 'typeorm';
import { BaseService } from '../src/base/base.service';
import { BaseController } from '../src/base/base.controller';
import { IsOptional, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

// --- Test Components ---

@Entity()
class TestEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @DeleteDateColumn()
    deletedAt: Date;
}

class CreateTestDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;
}

class UpdateTestDto {
    @IsString()
    @IsOptional()
    name?: string;
}

class TestResponseDto {
    @Expose()
    id: number;

    @Expose()
    name: string;

    @Expose({ groups: ['detail'] })
    description: string;
}

class TestService extends BaseService<TestEntity> {
    constructor(
        @InjectRepository(TestEntity)
        public repository: Repository<TestEntity>
    ) {
        super();
    }
}

const { Controller, Base } = BaseController<TestEntity, TestResponseDto>('Test', {
    CreateDto: CreateTestDto,
    UpdateDto: UpdateTestDto,
    ResponseDto: TestResponseDto,
    serializationGroups: ['detail'], // Default group for tests
    softDelete: true,
});

@Controller('tests')
class TestController extends Base {
    constructor(service: TestService) {
        super(service);
    }
}

// --- Test Suite ---

describe('CrudLibrary (e2e)', () => {
    let app: INestApplication;
    let repository: Repository<TestEntity>;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [TestEntity],
                    synchronize: true,
                }),
                TypeOrmModule.forFeature([TestEntity]),
            ],
            controllers: [TestController],
            providers: [TestService],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

        // Add logging for debugging
        app.useGlobalFilters({
            catch(exception, host) {
                const ctx = host.switchToHttp();
                const response = ctx.getResponse();

                if (exception.getStatus && typeof exception.getStatus === 'function') {
                    response.status(exception.getStatus()).json(exception.getResponse());
                } else {
                    console.error('Unhandled Exception:', exception);
                    response.status(500).json({
                        statusCode: 500,
                        message: 'Internal Server Error',
                    });
                }
            },
        });

        await app.init();

        repository = moduleFixture.get('TestEntityRepository');
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(async () => {
        await repository.clear();
    });

    describe('POST /tests', () => {
        it('should create a new entity', () => {
            return request(app.getHttpServer())
                .post('/tests')
                .send({ name: 'Test Item', description: 'A test description' })
                .expect(201)
                .expect((res) => {
                    expect(res.body.data.id).toBeDefined();
                    expect(res.body.data.name).toBe('Test Item');
                    expect(res.body.data.description).toBe('A test description');
                });
        });

        it('should fail with invalid data', () => {
            return request(app.getHttpServer())
                .post('/tests')
                .send({ description: 'Missing name' })
                .expect(400);
        });
    });

    describe('GET /tests', () => {
        beforeEach(async () => {
            await repository.save([
                { name: 'Item 1', description: 'Desc 1' },
                { name: 'Item 2', description: 'Desc 2' },
            ]);
        });

        it('should return all items', () => {
            return request(app.getHttpServer())
                .get('/tests')
                .expect(200)
                .expect((res) => {
                    expect(res.body.data.data).toHaveLength(2);
                    expect(res.body.data.meta.total).toBe(2);
                });
        });

        it('should support pagination', () => {
            return request(app.getHttpServer())
                .get('/tests?page=1&limit=1')
                .expect(200)
                .expect((res) => {
                    expect(res.body.data.data).toHaveLength(1);
                    expect(res.body.data.meta.total).toBe(2);
                });
        });
    });

    describe('GET /tests/:id', () => {
        let createdId: number;

        beforeEach(async () => {
            const item = await repository.save({ name: 'Target', description: 'Secret' });
            createdId = item.id;
        });

        it('should return one item', () => {
            return request(app.getHttpServer())
                .get(`/tests/${createdId}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body.data.name).toBe('Target');
                    expect(res.body.data.description).toBe('Secret'); // Included because of 'detail' group
                });
        });

        it('should return 404 for non-existent item', () => {
            return request(app.getHttpServer())
                .get('/tests/999')
                .expect(404);
        });
    });

    describe('PATCH /tests/:id', () => {
        let createdId: number;

        beforeEach(async () => {
            const item = await repository.save({ name: 'Original' });
            createdId = item.id;
        });

        it('should update an item', () => {
            return request(app.getHttpServer())
                .patch(`/tests/${createdId}`)
                .send({ name: 'Updated' })
                .expect(200)
                .expect((res) => {
                    expect(res.body.data.name).toBe('Updated');
                });
        });
    });

    describe('DELETE /tests/:id', () => {
        let createdId: number;

        beforeEach(async () => {
            const item = await repository.save({ name: 'To Delete' });
            createdId = item.id;
        });

        it('should soft delete an item', async () => {
            await request(app.getHttpServer())
                .delete(`/tests/${createdId}`)
                .expect(200);

            const item = await repository.findOne({ where: { id: createdId }, withDeleted: true });
            expect(item).toBeDefined();
            expect(item.deletedAt).toBeDefined(); // Assuming TypeORM soft delete adds deletedAt
        });
    });
});
