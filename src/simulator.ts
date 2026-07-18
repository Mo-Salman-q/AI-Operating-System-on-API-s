/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ServiceId, ServiceState, LogEvent, FailureType, ServiceStatus } from './types';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

class ServiceSimulator {
  private activeFailure: FailureType = 'none';
  private logs: LogEvent[] = [];
  private serviceStats: Record<ServiceId, { requests: number; successes: number; totalLatency: number }> = {
    auth: { requests: 0, successes: 0, totalLatency: 0 },
    cart: { requests: 0, successes: 0, totalLatency: 0 },
    payment: { requests: 0, successes: 0, totalLatency: 0 },
    order: { requests: 0, successes: 0, totalLatency: 0 },
  };

  constructor() {
    // Generate some initial historical logs to populate the dashboard nicely
    this.seedLogs();
  }

  public getActiveFailure(): FailureType {
    return this.activeFailure;
  }

  public setFailure(type: FailureType): void {
    this.activeFailure = type;
  }

  public getLogs(): LogEvent[] {
    return this.logs;
  }

  public clearLogs(): void {
    this.logs = [];
    this.serviceStats = {
      auth: { requests: 0, successes: 0, totalLatency: 0 },
      cart: { requests: 0, successes: 0, totalLatency: 0 },
      payment: { requests: 0, successes: 0, totalLatency: 0 },
      order: { requests: 0, successes: 0, totalLatency: 0 },
    };
  }

  private addLog(log: Omit<LogEvent, 'id' | 'timestamp'>) {
    const fullLog: LogEvent = {
      id: `log-${generateId()}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.logs.unshift(fullLog); // Newest first

    // Cap logs at 150
    if (this.logs.length > 150) {
      this.logs.pop();
    }

    // Update stats
    const svc = log.service.toLowerCase() as ServiceId;
    if (this.serviceStats[svc]) {
      this.serviceStats[svc].requests++;
      if (log.level !== 'error') {
        this.serviceStats[svc].successes++;
      }
      if (log.latencyMs) {
        this.serviceStats[svc].totalLatency += log.latencyMs;
      }
    }
  }

  // Trigger a full checkout flow simulation
  public triggerCheckout(): LogEvent[] {
    const requestId = `req-${generateId()}`;
    const localNewLogs: Omit<LogEvent, 'id' | 'timestamp'>[] = [];
    const failure = this.activeFailure;

    // --- SERVICE 1: AUTH ---
    const authLatency = failure === 'auth_expired_token' ? 12 : Math.floor(Math.random() * 20) + 15;
    this.addLog({
      service: 'Auth',
      level: 'info',
      message: `Received authorization request for checkout. RequestId: ${requestId}`,
      requestId,
    });

    if (failure === 'auth_expired_token') {
      this.addLog({
        service: 'Auth',
        level: 'error',
        message: `Authentication token validation failed. Error: EXPIRED_SIGNATURE. RequestId: ${requestId}`,
        requestId,
        latencyMs: authLatency,
        statusCode: 401,
      });

      // Downstream failure propagation to Cart
      this.addLog({
        service: 'Cart',
        level: 'error',
        message: `Checkout request aborted upstream due to unauthorized authorization header. Authorization signature verification returned 401. RequestId: ${requestId}`,
        requestId,
        latencyMs: 5,
        statusCode: 401,
      });
      return this.logs.slice(0, 3);
    } else {
      this.addLog({
        service: 'Auth',
        level: 'info',
        message: `User session successfully authenticated. JWT validated. RequestId: ${requestId}`,
        requestId,
        latencyMs: authLatency,
        statusCode: 200,
      });
    }

    // --- SERVICE 2: CART ---
    const cartLatency = failure === 'cart_rate_limit' ? 8 : Math.floor(Math.random() * 30) + 25;
    this.addLog({
      service: 'Cart',
      level: 'info',
      message: `Fetching cart contents and validating inventory. RequestId: ${requestId}`,
      requestId,
    });

    if (failure === 'cart_rate_limit') {
      this.addLog({
        service: 'Cart',
        level: 'error',
        message: `Rate limit exceeded for client session. Active connection pool exhausted (30/30). Cannot retrieve redis-cart key. RequestId: ${requestId}`,
        requestId,
        latencyMs: cartLatency,
        statusCode: 429,
      });

      this.addLog({
        service: 'Payment',
        level: 'warn',
        message: `Payment flow aborted. Missing validated cart payload from upstream Cart service. RequestId: ${requestId}`,
        requestId,
        statusCode: 400,
      });
      return this.logs.slice(0, 5);
    } else {
      this.addLog({
        service: 'Cart',
        level: 'info',
        message: `Inventory confirmed for 3 items: [Holographic Widget (x1), Synth Keycap (x2)]. RequestId: ${requestId}`,
        requestId,
        latencyMs: cartLatency,
        statusCode: 200,
      });
    }

    // --- SERVICE 3: PAYMENT ---
    this.addLog({
      service: 'Payment',
      level: 'info',
      message: `Initiating processing card payment of $245.99 via credit-processor. RequestId: ${requestId}`,
      requestId,
    });

    if (failure === 'payment_db_timeout') {
      // Simulate multiple database timeout retries
      const paymentLatency = 5020; // 5 seconds DB timeout
      this.addLog({
        service: 'Payment',
        level: 'warn',
        message: `Database connection pool check. No available idle connections. Retrying in 1000ms... (Attempt 1/3). RequestId: ${requestId}`,
        requestId,
      });
      this.addLog({
        service: 'Payment',
        level: 'warn',
        message: `Database connection pool check. No available idle connections. Retrying in 2000ms... (Attempt 2/3). RequestId: ${requestId}`,
        requestId,
      });
      this.addLog({
        service: 'Payment',
        level: 'error',
        message: `PostgreSQL database timeout connection failed: pool-exhaustion (timeout 5000ms). Connection timed out when executing 'UPDATE accounts SET balance = balance - 245.99'. RequestId: ${requestId}`,
        requestId,
        latencyMs: paymentLatency,
        statusCode: 504,
      });

      // Downstream failure propagation to Order
      this.addLog({
        service: 'Order',
        level: 'error',
        message: `Failed to execute checkout: Upstream Payment service returned status code 504. Aborting order creation. RequestId: ${requestId}`,
        requestId,
        latencyMs: 12,
        statusCode: 500,
      });
      return this.logs.slice(0, 10);
    } else {
      const paymentLatency = Math.floor(Math.random() * 80) + 120;
      this.addLog({
        service: 'Payment',
        level: 'info',
        message: `Credit transaction authorized successfully by external processor Stripe. Gateway Ref: tx_${generateId()}. RequestId: ${requestId}`,
        requestId,
        latencyMs: paymentLatency,
        statusCode: 200,
      });
    }

    // --- SERVICE 4: ORDER ---
    this.addLog({
      service: 'Order',
      level: 'info',
      message: `Received order creation trigger from Payment webhook. RequestId: ${requestId}`,
      requestId,
    });

    if (failure === 'order_disk_full') {
      const orderLatency = 145;
      this.addLog({
        service: 'Order',
        level: 'error',
        message: `FATAL ENOSPC: No space left on device. Failed to write invoices logs to disk /var/log/orders/invoice_${requestId}.json. Storage is at 100% capacity. RequestId: ${requestId}`,
        requestId,
        latencyMs: orderLatency,
        statusCode: 500,
      });
      return this.logs.slice(0, 12);
    } else {
      const orderLatency = Math.floor(Math.random() * 40) + 40;
      this.addLog({
        service: 'Order',
        level: 'info',
        message: `Order stored in master PostgreSQL database. Invoice ID: inv-${generateId()}. Order dispatch pipeline started. RequestId: ${requestId}`,
        requestId,
        latencyMs: orderLatency,
        statusCode: 201,
      });
    }

    return this.logs;
  }

  // Generate mock history of healthy and failing requests for UI load
  private seedLogs(): void {
    // Generate healthy logs
    for (let i = 0; i < 6; i++) {
      const rid = `req-seed-${generateId()}`;
      const mockTime = new Date(Date.now() - (6 - i) * 60000);

      const addSeedLog = (log: Omit<LogEvent, 'id' | 'timestamp'>) => {
        this.logs.push({
          id: `log-${generateId()}`,
          timestamp: mockTime.toISOString(),
          ...log,
        });
        const svc = log.service.toLowerCase() as ServiceId;
        this.serviceStats[svc].requests++;
        this.serviceStats[svc].successes++;
        if (log.latencyMs) this.serviceStats[svc].totalLatency += log.latencyMs;
      };

      addSeedLog({ service: 'Auth', level: 'info', message: `Received authorization request for checkout. RequestId: ${rid}`, requestId: rid });
      addSeedLog({ service: 'Auth', level: 'info', message: `User session successfully authenticated. JWT validated. RequestId: ${rid}`, requestId: rid, latencyMs: 25, statusCode: 200 });
      addSeedLog({ service: 'Cart', level: 'info', message: `Fetching cart contents and validating inventory. RequestId: ${rid}`, requestId: rid });
      addSeedLog({ service: 'Cart', level: 'info', message: `Inventory confirmed for 3 items. RequestId: ${rid}`, requestId: rid, latencyMs: 40, statusCode: 200 });
      addSeedLog({ service: 'Payment', level: 'info', message: `Initiating processing card payment of $120.00. RequestId: ${rid}`, requestId: rid });
      addSeedLog({ service: 'Payment', level: 'info', message: `Credit transaction authorized successfully by external processor Stripe. RequestId: ${rid}`, requestId: rid, latencyMs: 150, statusCode: 200 });
      addSeedLog({ service: 'Order', level: 'info', message: `Received order creation trigger. RequestId: ${rid}`, requestId: rid });
      addSeedLog({ service: 'Order', level: 'info', message: `Order stored in database. Order dispatch pipeline started. RequestId: ${rid}`, requestId: rid, latencyMs: 65, statusCode: 201 });
    }
  }

  public getServices(): ServiceState[] {
    const services: ServiceId[] = ['auth', 'cart', 'payment', 'order'];
    const serviceNames: Record<ServiceId, string> = {
      auth: 'Auth Service',
      cart: 'Cart Service',
      payment: 'Payment Service',
      order: 'Order Service',
    };
    const dependencies: Record<ServiceId, ServiceId[]> = {
      auth: [],
      cart: ['auth'],
      payment: ['cart'],
      order: ['payment'],
    };

    return services.map((id) => {
      const stats = this.serviceStats[id];
      const reqCount = stats.requests || 1; // Avoid divide by zero
      const errorCount = stats.requests - stats.successes;
      const errorRate = Math.round((errorCount / reqCount) * 100);
      const avgLatency = Math.round(stats.totalLatency / (stats.successes || 1));

      // Determine status based on active failure and errorRate
      let status: ServiceStatus = 'healthy';
      if (this.activeFailure !== 'none') {
        const failure = this.activeFailure;
        if (id === 'auth' && failure === 'auth_expired_token') status = 'down';
        else if (id === 'cart' && (failure === 'cart_rate_limit' || failure === 'auth_expired_token')) status = 'degraded';
        else if (id === 'payment' && failure === 'payment_db_timeout') status = 'down';
        else if (id === 'payment' && failure === 'cart_rate_limit') status = 'degraded';
        else if (id === 'order' && failure === 'order_disk_full') status = 'down';
        else if (id === 'order' && (failure === 'payment_db_timeout' || failure === 'order_disk_full')) status = 'degraded';
      }

      return {
        id,
        name: serviceNames[id],
        status,
        dependencies: dependencies[id],
        metrics: {
          latencyMs: avgLatency || (id === 'payment' ? 180 : id === 'order' ? 55 : id === 'cart' ? 45 : 25),
          errorRate,
          requestCount: stats.requests,
          successCount: stats.successes,
        },
      };
    });
  }
}

export const simulator = new ServiceSimulator();
