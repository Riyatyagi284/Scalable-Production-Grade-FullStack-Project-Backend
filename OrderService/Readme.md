
# Order Service - E-Commerce [Order & Payment Management] System
A production-ready, event-driven microservice for managing orders, payments, coupons, and customers in a modern e-commerce platform. Built with Node.js, Express, MongoDB, TypeScript and Kafka, this service provides robust transaction handling with idempotency guarantees and seamless Stripe integration.

## Overview
Order Service is a core microservice in the e-commerce platform that handles all order-related operations, payment processing, coupon validation, and customer management. It implements an event-driven architecture using Kafka for asynchronous communication with other services.

## Key Business Capabilities:
    1. Complete order lifecycle management
    2. Secure payment processing with Stripe
    3. Coupon system with verification and validation
    4. Customer address management
    5. Idempotent, transaction, And Retry Logic handling
    6. Real-time order status updates
    7. Event-driven architecture with Kafka
    8. Webhook handling for payment events

## Design Patterns Used:
    -- Dependency Injection: Services are injected into controllers
    -- Repository Pattern: Mongoose models for data access
    -- Middleware Chain: Authentication and validation pipeline
    -- Factory Pattern: Service instantiation
    -- DTO Pattern: Request/Response validation
    -- Strategy Pattern: Payment gateway abstraction
    -- Event-Driven Architecture: Service decoupling
    -- Idempotency Pattern: Duplicate request prevention
    -- Webhook Pattern: Asynchronous payment updates

## Code Quality Tools
    -- ESLint for code linting
    -- Prettier for code formatting
    -- Husky for pre-commit hook
