# @thephilosoph/nestjs-crud-base

A powerful and flexible CRUD library for NestJS that provides base classes for rapid REST API development with TypeORM. Built-in support for pagination, filtering, serialization, soft delete, and file uploads.

[![npm version](https://img.shields.io/npm/v/@thephilosoph/nestjs-crud-base.svg)](https://www.npmjs.com/package/@thephilosoph/nestjs-crud-base)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

✨ **Base Controller & Service** - Extend pre-built classes for instant CRUD operations  
📄 **Pagination** - Built-in pagination with customizable page size and sorting  
🔍 **Filtering** - Query parameter-based filtering  
🎯 **Serialization** - Response DTOs with class-transformer groups  
🗑️ **Soft Delete** - Optional soft delete support  
📁 **File Uploads** - Built-in file upload handling  
🔄 **Transactions** - Transaction support out of the box  
📚 **Swagger Integration** - Automatic API documentation  

## Installation

```bash
npm install @thephilosoph/nestjs-crud-base
```

### Peer Dependencies

This library requires the following peer dependencies:

```bash
npm install @nestjs/common @nestjs/core @nestjs/typeorm @nestjs/swagger \
  typeorm class-transformer class-validator reflect-metadata rxjs
```

## Quick Start

### 1. Create Your Entity

```typescript
import { Entity, PrimaryGeneratedColumn, Column, DeleteDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @DeleteDateColumn()
  deletedAt: Date;
}
```

### 2. Create DTOs

```typescript
import { IsString, IsEmail } from 'class-validator';
import { Expose } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;
}

export class UpdateUserDto {
  @IsString()
  name?: string;
}

export class UserResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  email: string;
}
```

### 3. Create Service

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '@nestjs-crud/base';
import { User } from './user.entity';

@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    public repository: Repository<User>
  ) {
    super();
  }
}
```

### 4. Create Controller

```typescript
import { Controller } from '@nestjs/common';
import { BaseController } from '@thephilosoph/nestjs-crud-base';
import { User } from './user.entity';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './user.dto';

const { Controller: CrudController, Base } = BaseController<User, UserResponseDto>('User', {
  CreateDto: CreateUserDto,
  UpdateDto: UpdateUserDto,
  ResponseDto: UserResponseDto,
  softDelete: true,
});

@Controller('users')
export class UserController extends Base {
  constructor(service: UserService) {
    super(service);
  }
}
```

### 5. Register in Module

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
```

## API Endpoints

The `BaseController` automatically provides the following endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users` | Create a new user |
| GET | `/users` | Get all users (paginated) |
| GET | `/users/:id` | Get user by ID |
| PATCH | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user (soft delete if enabled) |

## Configuration Options

### CrudOptions Interface

The `CrudOptions` interface provides comprehensive configuration for your CRUD controllers. All options are optional unless specified.

```typescript
interface CrudOptions<T, TResponseDto> {
  CreateDto?: Type<any>;
  UpdateDto?: Type<any>;
  ResponseDto?: ClassConstructor<TResponseDto>;
  allowedRelationsFindOne?: (keyof T & string)[];
  allowedRelationsFindAll?: (keyof T & string)[];
  guards?: CrudGuards;
  createInterceptor?: any;
  createFileField?: string;
  serializationGroups?: string[];
  softDelete?: boolean;
}
```

### Option Details

#### `CreateDto`
- **Type**: `Type<any>`
- **Required**: Recommended
- **Description**: DTO class for validating create requests
- **Example**:
```typescript
class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;
}

// Usage in controller
const { Base } = BaseController<User, UserResponseDto>('User', {
  CreateDto: CreateUserDto,
  // ...
});
```

#### `UpdateDto`
- **Type**: `Type<any>`
- **Required**: Recommended
- **Description**: DTO class for validating update requests. Typically has optional fields.
- **Example**:
```typescript
class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
```

#### `ResponseDto`
- **Type**: `ClassConstructor<TResponseDto>`
- **Required**: Recommended
- **Description**: DTO class for serializing responses. Uses class-transformer's `@Expose()` decorator.
- **Example**:
```typescript
class UserResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  email: string;

  // This field won't be exposed in responses
  password: string;
}
```

#### `serializationGroups`
- **Type**: `string[]`
- **Default**: `undefined`
- **Description**: class-transformer groups for selective field exposure. Allows different fields for different endpoints.
- **Example**:
```typescript
class UserResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose({ groups: ['detail'] })
  email: string;  // Only shown when 'detail' group is active

  @Expose({ groups: ['admin'] })
  role: string;   // Only shown when 'admin' group is active
}

// Controller configuration
const { Base } = BaseController<User, UserResponseDto>('User', {
  ResponseDto: UserResponseDto,
  serializationGroups: ['detail'], // Default groups for all endpoints
});
```

#### `softDelete`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Enables soft delete (sets `deletedAt` timestamp instead of removing from database). Requires `@DeleteDateColumn()` in your entity.
- **Example**:
```typescript
// Entity with soft delete support
@Entity()
class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @DeleteDateColumn()
  deletedAt: Date;  // Required for soft delete
}

// Controller configuration
const { Base } = BaseController<User, UserResponseDto>('User', {
  softDelete: true,  // DELETE requests will soft delete
});
```

#### `allowedRelationsFindOne`
- **Type**: `(keyof T & string)[]`
- **Default**: `[]`
- **Description**: Array of relation names that can be included when fetching a single item via query parameter.
- **Example**:
```typescript
// Entity with relations
@Entity()
class User {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Profile)
  profile: Profile;

  @OneToMany(() => Post, post => post.user)
  posts: Post[];
}

// Controller configuration
const { Base } = BaseController<User, UserResponseDto>('User', {
  allowedRelationsFindOne: ['profile', 'posts'],
});

// Usage: GET /users/1?include=profile,posts
```

#### `allowedRelationsFindAll`
- **Type**: `(keyof T & string)[]`
- **Default**: `[]`
- **Description**: Array of relation names that can be included when fetching multiple items.
- **Example**:
```typescript
const { Base } = BaseController<User, UserResponseDto>('User', {
  allowedRelationsFindAll: ['profile'],  // Only allow profile, not posts
});

// Usage: GET /users?include=profile
```

#### `guards`
- **Type**: `CrudGuards`
- **Default**: `undefined`
- **Description**: Apply guards to specific CRUD endpoints.
- **Example**:
```typescript
interface CrudGuards {
  create?: MethodDecorator[];
  update?: MethodDecorator[];
  delete?: MethodDecorator[];
  findOne?: MethodDecorator[];
  findAll?: MethodDecorator[];
}

// Usage
const { Base } = BaseController<User, UserResponseDto>('User', {
  guards: {
    create: [UseGuards(AuthGuard)],
    update: [UseGuards(AuthGuard, OwnershipGuard)],
    delete: [UseGuards(AuthGuard, AdminGuard)],
  },
});
```

#### `createInterceptor`
- **Type**: `any`
- **Default**: `undefined`
- **Description**: Custom interceptor for the create endpoint.
- **Example**:
```typescript
const { Base } = BaseController<User, UserResponseDto>('User', {
  createInterceptor: UseInterceptors(TransformInterceptor),
});
```

#### `createFileField`
- **Type**: `string`
- **Default**: `undefined`
- **Description**: Field name for file uploads in create requests. Enables file upload handling.
- **Example**:
```typescript
const { Base } = BaseController<User, UserResponseDto>('User', {
  createFileField: 'avatar',  // Expects multipart/form-data with 'avatar' field
});

// Override handleFiles in service to process uploads
class UserService extends BaseService<User> {
  protected async handleFiles(entity: User, files: Express.Multer.File[]): Promise<void> {
    if (files.length > 0) {
      entity.avatarPath = files[0].path;
      await this.repository.save(entity);
    }
  }
}
```

### Complete Example with All Options

```typescript
const { Controller: CrudController, Base } = BaseController<User, UserResponseDto>('User', {
  // DTOs
  CreateDto: CreateUserDto,
  UpdateDto: UpdateUserDto,
  ResponseDto: UserResponseDto,
  
  // Serialization
  serializationGroups: ['detail'],
  
  // Relations
  allowedRelationsFindOne: ['profile', 'posts', 'comments'],
  allowedRelationsFindAll: ['profile'],
  
  // Soft Delete
  softDelete: true,
  
  // Guards
  guards: {
    create: [UseGuards(AuthGuard)],
    update: [UseGuards(AuthGuard, OwnershipGuard)],
    delete: [UseGuards(AuthGuard, AdminGuard)],
  },
  
  // File Upload
  createFileField: 'avatar',
  createInterceptor: UseInterceptors(FileInterceptor('avatar')),
});

@Controller('users')
export class UserController extends Base {
  constructor(service: UserService) {
    super(service);
  }
}
```


## Advanced Usage

### Pagination

```bash
GET /users?page=1&limit=10&sort=name:ASC
```

Query parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `sort` - Sort format: `field:ASC` or `field:DESC`

### Filtering

```bash
GET /users?name=John&email=john@example.com
```

All query parameters (except `page`, `limit`, `sort`) are treated as filters.

### Serialization Groups

Use class-transformer groups to control which fields are exposed:

```typescript
export class UserResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose({ groups: ['detail'] })
  email: string;  // Only shown when 'detail' group is active
}
```

### File Uploads

Override the `handleFiles` method in your service:

```typescript
@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    public repository: Repository<User>
  ) {
    super();
  }

  protected async handleFiles(entity: User, files: Express.Multer.File[]): Promise<void> {
    // Handle file upload logic here
    if (files.length > 0) {
      entity.avatarPath = files[0].path;
      await this.repository.save(entity);
    }
  }
}
```

### Transactions

Use the built-in transaction support:

```typescript
await this.userService.transactional(async (manager) => {
  const user = await this.userService.create(createUserDto, manager);
  // Other operations within the same transaction
  return user;
});
```

### Custom Methods

Extend the base controller with custom endpoints:

```typescript
@Controller('users')
export class UserController extends Base {
  constructor(private readonly userService: UserService) {
    super(userService);
  }

  @Get('search')
  async search(@Query('q') query: string) {
    // Custom search logic
    return this.userService.findAll({
      where: { name: Like(`%${query}%`) }
    });
  }
}
```

## API Response Format

All responses follow a consistent format:

### Success Response (Single Item)
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Success Response (Paginated)
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "data": [...],
    "meta": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10
    }
  }
}
```

## Requirements

- NestJS 11.x
- TypeORM 0.3.x
- Node.js 18+

## License

MIT © 2025

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.
