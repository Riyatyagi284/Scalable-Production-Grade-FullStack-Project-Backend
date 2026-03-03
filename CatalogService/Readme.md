
# Catalog Service - Product & Category Management System
A production-ready, event-driven microservice for managing products, categories, and toppings in a modern e-commerce platform. Built with Node.js, Express, MongoDB, TypeScript and Kafka, this service provides comprehensive catalog management with S3 image storage and real-time inventory updates.

## Overview
Catalog Service is the central repository for all product-related data in the e-commerce platform. It manages the complete product lifecycle, hierarchical categories, and customizable toppings with real-time synchronization across services via Kafka events.

## Key Highlights:
    1. Complete product catalog management
    2. category management system
    3. Topping customization options
    4. Image upload and management with AWS S3
    5. Real-time catalog updates via Kafka
    6. Role-based access control (Admin/Manager)
    7. Pagination and aggregation pipelines
    8. Event-driven architecture
    9. Multi-environment configuration

## Design Patterns Used:
    -- Dependency Injection: Services are injected into controllers
    -- Repository Pattern: Mongoose models for data access
    -- Factory Pattern: Service instantiation
    -- Strategy Pattern: Cloud (s3 storage) storage abstraction
    -- Event-Driven Architecture: (Kafka) Service decoupling
    -- Aggregation Pipeline: Efficient data querying

## Code Quality Tools
    -- ESLint for code linting
    -- Prettier for code formatting
    -- Husky for pre-commit hook
    
