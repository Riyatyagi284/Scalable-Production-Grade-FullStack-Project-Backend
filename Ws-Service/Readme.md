
# WebSocket Service - Real-Time Notification System
 A production-ready, event-driven WebSocket service for real-time Notification. Built with Socket.IO, Node.js, and Kafka.

## Key Business Capabilities:
    1.  Real-time order status updates
    2.  Live inventory notifications
    3.  Instant payment confirmations
    4.  Multi-tenant isolation via rooms
    5.  Kafka consumer integration
    6.  Connection lifecycle management
    7. CORS-enabled for multiple domains

## Design Patterns Used:
    -- Factory Pattern: Service instantiation
    -- Singleton Pattern: Single WebSocket server
    -- Observer Pattern: Real-time notifications
    -- Strategy Pattern: Cloud (s3 storage) storage abstraction
    -- Event-Driven Architecture: (Kafka) Service decoupling
