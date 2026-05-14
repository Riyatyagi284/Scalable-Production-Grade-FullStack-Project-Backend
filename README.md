
## Microservice Architecture [Project] - E-Commerce Platform
 A production-grade, enterprise-level e-commerce platform built with microservices architecture, and implementing industry best practices used in software development .

 



https://github.com/user-attachments/assets/f5e26517-ed90-4975-ac20-5114c9d0ef98




 ## Project Overview
This project is a comprehensive, production-ready e-commerce platform built from the ground up using microservices architecture. It demonstrates how to break down complex systems into manageable, scalable, and independently deployable services.

## My Learning Outcomes
    1. Microservice Architecture (Break down complex systems into 5+ independently services)
    
    2. Test-Driven Development (TDD)	
    
    3. REST API Design	Efficient, scalable APIs with proper validation, and error handling
    
    4. Token-Based Authentication	Secure JWT-based auth with refresh token rotation (RS256 AND HS256) based algorithms.
    
    5. Complete admin APIs for user, product, and order management
    
    6. Payment Gateway Integration	(Seamless Stripe integration with webhooks , idempotency, transactions) 
    
    7. Real-Time WebSocket service for live updates and notifications
    
    8. Database Design	Optimal schema design for PostgreSQL and MongoDB
    
    9. Multi-Tenancy Systems	SaaS-ready tenant isolation and management
    
    10. Performance Optimization	Caching strategies and database indexing
    
    11. Docker Containerization	Professional containerization with multi-stage builds
    
    12. Role-Based Permissions	Fine-grained access control with RBAC
    
    13. Event-Driven Architecture	(Asynchronous communication with Kafka)
    
    14. Explore AWS services (EC2, IAM, S3, Autoscaling, Security groups, Network ACL(s), RDS, Dynamodb, Lambda, ... etc)

## Running locally

Each service has its own setup. Start with the auth service:

- **AuthService** — see [`AuthService/SETUP.md`](AuthService/SETUP.md). One command brings up Postgres (`docker compose up -d`), then `npm install && npm run dev`.
- **CatalogService**, **OrderService**, **Ws-Service**, **Admin-UI**, **Client-UI** — see each service's `Readme.md`.

Common gotcha: PostgreSQL's default superuser is `postgres`, not `root`. If you see `password authentication failed for user "root"`, check `DB_USERNAME` in your `.env.dev`.

