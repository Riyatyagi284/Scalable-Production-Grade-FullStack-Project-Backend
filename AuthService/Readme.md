
# Auth Service - User & Tenant Management System
A production-ready authentication and authorization microservice built with Node.js, Express, TypeORM, and TypeScript. This service provides comprehensive user management, multi-tenant architecture, and robust JWT-based authentication.

## Overview
Auth Service is a robust, scalable authentication microservice designed to handle complex user management scenarios in multi-tenant applications. It provides a complete authentication solution with role-based access control (RBAC), refresh token rotation, and comprehensive tenant isolation.

## Key Highlights:
    1. Complete authentication flow (Register, Login, Logout, Refresh Token)
    2. Multi-tenant architecture with complete isolation
    3. Role-based access control (Admin, Manager, User)
    4. JWT token management with refresh token rotation
    5. Request validation and sanitization
    6. Comprehensive error handling
    7. TypeORM with PostgreSQL
    8. TypeScript codebase
    9. Integration test cases covered

## Design Patterns Used:
    -- Dependency Injection: Services are injected into controllers
    -- Repository Pattern: TypeORM repositories for data access
    -- Middleware Chain: Authentication and validation pipeline
    -- Factory Pattern: Service instantiation
    -- DTO Pattern: Request/Response validation

## Security Features
    -- Password hashing using bcryptjs (10 rounds) 
    -- JWT with RS256 and HS256 algorithms used for signing
    -- Refresh token rotation with database storage
    -- Role-based access control (RBAC)
    -- Request validation and sanitization
    -- CORS enabled
    -- HTTP error handling
    -- Environment-based configuration

## Code Quality Tools
    -- ESLint for code linting
    -- Prettier for code formatting
    -- Husky for pre-commit hook
    
