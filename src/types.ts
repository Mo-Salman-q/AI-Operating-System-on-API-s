/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ServiceId = 'auth' | 'cart' | 'payment' | 'order';

export type ServiceStatus = 'healthy' | 'degraded' | 'down';

export interface LogEvent {
  id: string;
  timestamp: string;
  service: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  requestId: string;
  latencyMs?: number;
  statusCode?: number;
}

export interface ServiceMetrics {
  latencyMs: number;
  errorRate: number; // 0 to 100 percentage
  requestCount: number;
  successCount: number;
}

export interface ServiceState {
  id: ServiceId;
  name: string;
  status: ServiceStatus;
  dependencies: ServiceId[];
  metrics: ServiceMetrics;
}

export type FailureType =
  | 'none'
  | 'payment_db_timeout'
  | 'auth_expired_token'
  | 'cart_rate_limit'
  | 'order_disk_full';

export interface FailureConfig {
  type: FailureType;
  label: string;
  description: string;
  targetService: ServiceId;
}

export interface RcaDiagnosis {
  root_cause: string;
  service: string;
  symptom: string;
  affected_services: string[];
  suggested_fix: string;
  confidence: number;
}

export interface TestCase {
  name: string;
  method: string;
  url: string;
  body: Record<string, any>;
  headers: Record<string, any>;
  expectedStatus: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  diagnosis?: RcaDiagnosis;
  tests?: TestCase[];
  isDocs?: boolean;
  isTests?: boolean;
  service?: string;
  isPending?: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: string;
  specs: Record<string, string>;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

