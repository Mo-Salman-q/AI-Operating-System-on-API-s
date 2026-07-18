/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { simulator } from './src/simulator';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON payloads
  app.use(express.json());

  // 1. API: Get Services Status & Metrics
  app.get('/api/services', (req, res) => {
    try {
      const services = simulator.getServices();
      const activeFailure = simulator.getActiveFailure();
      res.json({ success: true, services, activeFailure });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. API: Trigger a Checkout Simulation (Generates fresh logs)
  app.post('/api/checkout', (req, res) => {
    try {
      const logs = simulator.triggerCheckout();
      const services = simulator.getServices();
      res.json({ success: true, logs, services });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. API: Get Recent System Logs
  app.get('/api/logs', (req, res) => {
    try {
      const logs = simulator.getLogs();
      res.json({ success: true, logs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. API: Inject or Clear Failure State
  app.post('/api/failure', (req, res) => {
    try {
      const { type } = req.body;
      simulator.setFailure(type);
      const services = simulator.getServices();
      res.json({ success: true, activeFailure: simulator.getActiveFailure(), services });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. API: Reset System (Clear logs, metrics, failures)
  app.post('/api/reset', (req, res) => {
    try {
      simulator.clearLogs();
      const services = simulator.getServices();
      res.json({ success: true, services, logs: [] });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Mock API endpoints for each service
  const serviceEndpoints = {
    Auth: ["POST /auth/login", "GET /auth/user"],
    Cart: ["POST /cart/add", "POST /cart/checkout"],
    Payment: ["POST /payment/charge"],
    Order: ["POST /order/create"]
  };

  // 6a. API: Get service endpoints
  app.get('/api/endpoints', (req, res) => {
    res.json({ success: true, endpoints: serviceEndpoints });
  });

  // 6b. API: Discover Topology Agent - Proxies to Gemini API
  app.post('/api/discover', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.status(400).json({
          success: false,
          error: 'Gemini API Key is missing. Please add your GEMINI_API_KEY secret in the AI Studio Secrets panel.'
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `You are a Discovery agent for a microservices system. Given a list of
service endpoints, determine which services call which other services
during a typical checkout flow, based on endpoint names and common
sense about e-commerce systems (auth happens first, cart before
payment, payment before order creation).
Respond ONLY with JSON in this shape:
{ "Auth": [], "Cart": ["Payment"], "Payment": ["Order"], "Order": [] }
Each key is a service name; its array lists the services it calls directly.`;

      const userMessage = `Here is the list of service endpoints:
${JSON.stringify(serviceEndpoints, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: userMessage,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              Auth: { type: Type.ARRAY, items: { type: Type.STRING } },
              Cart: { type: Type.ARRAY, items: { type: Type.STRING } },
              Payment: { type: Type.ARRAY, items: { type: Type.STRING } },
              Order: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['Auth', 'Cart', 'Payment', 'Order']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Received empty response from Gemini API.');
      }

      const graph = JSON.parse(responseText.trim());
      res.json({ success: true, graph });
    } catch (error: any) {
      console.error('Discovery Agent Error:', error);
      res.status(500).json({ success: false, error: error.message || 'An error occurred during discovery.' });
    }
  });

  // Detailed endpoints source for Documentation Agent and Test-Generator Agent
  const serviceEndpointsDetailed = {
    Auth: [
      {
        endpoint: "POST /auth/login",
        description: "Authenticates a user and issues a secure session token.",
        parameters: { username: "string", password: "string" },
        responses: [
          { status: 200, meaning: "Success. Returns jwtToken and user details." },
          { status: 401, meaning: "Unauthorized. Invalid credentials or expired session." },
          { status: 500, meaning: "Internal Server Error. Database or key server connectivity failure." }
        ]
      },
      {
        endpoint: "GET /auth/user",
        description: "Retrieves the currently authenticated user's profile details using the session bearer token.",
        parameters: { headers: { Authorization: "Bearer <token>" } },
        responses: [
          { status: 200, meaning: "Success. Returns authenticated user information." },
          { status: 401, meaning: "Unauthorized. Token invalid, missing, or signature validation failed." },
          { status: 500, meaning: "Internal Server Error. Database exception during retrieval." }
        ]
      }
    ],
    Cart: [
      {
        endpoint: "POST /cart/add",
        description: "Adds a specific item and quantity to the user's active shopping cart.",
        parameters: { productId: "string", quantity: "number", cartId: "string (optional)" },
        responses: [
          { status: 200, meaning: "Success. Returns full list of current cart items and total calculations." },
          { status: 400, meaning: "Bad Request. Invalid product ID or item quantity value." },
          { status: 500, meaning: "Internal Server Error. Redis cache connection failure." }
        ]
      },
      {
        endpoint: "POST /cart/checkout",
        description: "Locks the cart contents, reserves stock inventory, and prepares the cart for payment processing.",
        parameters: { cartId: "string", shippingAddressId: "string" },
        responses: [
          { status: 200, meaning: "Success. Returns reserved items list and invoice amounts." },
          { status: 400, meaning: "Bad Request. Shopping cart is empty or expired." },
          { status: 429, meaning: "Too Many Requests. Cart service rate limits or concurrent inventory lock exhaustion." },
          { status: 500, meaning: "Internal Server Error. Database storage reservation block." }
        ]
      }
    ],
    Payment: [
      {
        endpoint: "POST /payment/charge",
        description: "Charges a customer's registered credit card/payment method through a secure merchant gateway.",
        parameters: { customerId: "string", amount: "number", paymentMethodToken: "string" },
        responses: [
          { status: 200, meaning: "Success. Returns processed transactionId and gateway code." },
          { status: 400, meaning: "Bad Request. Invalid card parameters or payment method declined." },
          { status: 504, meaning: "Gateway Timeout. Connection timeout to the card processor or ledger database." },
          { status: 500, meaning: "Internal Server Error. Gateway communication interface failure." }
        ]
      }
    ],
    Order: [
      {
        endpoint: "POST /order/create",
        description: "Creates and persists a finalized order, permanent inventory deduction, and triggers email notifications.",
        parameters: { customerId: "string", items: "Array<{productId: string, quantity: number}>", total: "number", paymentTransactionId: "string" },
        responses: [
          { status: 201, meaning: "Created. Returns the finalized orderId, tracking reference, and invoice receipt." },
          { status: 400, meaning: "Bad Request. Missing payment transaction reference or empty item list." },
          { status: 500, meaning: "Internal Server Error. Database write-protection triggered or disk space full." }
        ]
      }
    ]
  };

  // 6. API: Intelligent Supervisor & RCA Diagnosis Agent - Routing and executing LLM actions
  app.post('/api/diagnose', async (req, res) => {
    try {
      const { prompt, dependencyGraph } = req.body;
      const recentLogs = simulator.getLogs().slice(0, 40); // Send up to 40 logs for context
      const activeFailure = simulator.getActiveFailure();

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.status(400).json({
          success: false,
          error: 'Gemini API Key is missing. Please add your GEMINI_API_KEY secret in the AI Studio Secrets panel.'
        });
      }

      // Lazy load Gemini Client to prevent crash on startup if key is missing
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const promptStr = prompt || '';
      const pLower = promptStr.toLowerCase();

      // Keyword helpers
      const containsRcaKeywords = (p: string) => {
        return ['why', 'fail', 'broken', 'error', 'failed', 'diagnose', 'crash', 'timeout', 'issue', 'symptom', 'cascade', 'status'].some(kw => p.includes(kw));
      };

      const containsDocsKeywords = (p: string) => {
        return ['docs', 'document', 'how does', 'api reference', 'how do i use', 'documentation', 'markdown', 'describe', 'specification'].some(kw => p.includes(kw));
      };

      const containsTestsKeywords = (p: string) => {
        return ['test', 'tests', 'generate tests', 'spec', 'test suite', 'testing', 'mock test', 'cases', 'assert'].some(kw => p.includes(kw));
      };

      const detectService = (p: string): 'Auth' | 'Cart' | 'Payment' | 'Order' | null => {
        const hasAuth = ['auth', 'login', 'token', 'user', 'authenticate', 'credentials', 'sign'].some(kw => p.includes(kw));
        const hasCart = ['cart', 'checkout', 'add', 'shopping', 'redis', 'reservation'].some(kw => p.includes(kw));
        const hasPayment = ['payment', 'charge', 'pay', 'card', 'merchant', 'gateway'].some(kw => p.includes(kw));
        const hasOrder = ['order', 'fulfillment', 'create order', 'receipt', 'disk full'].some(kw => p.includes(kw));

        const detected: ('Auth' | 'Cart' | 'Payment' | 'Order')[] = [];
        if (hasAuth) detected.push('Auth');
        if (hasCart) detected.push('Cart');
        if (hasPayment) detected.push('Payment');
        if (hasOrder) detected.push('Order');

        if (detected.length === 1) {
          return detected[0];
        }
        return null;
      };

      // 1. Classification & Routing
      let route: 'rca' | 'docs' | 'tests' | 'clarify' = 'rca';

      if (containsRcaKeywords(pLower)) {
        route = 'rca';
      } else if (containsDocsKeywords(pLower)) {
        const service = detectService(pLower);
        route = service ? 'docs' : 'clarify';
      } else if (containsTestsKeywords(pLower)) {
        const service = detectService(pLower);
        route = service ? 'tests' : 'clarify';
      } else {
        route = 'rca';
      }

      // 2. Execution of Routed Agent
      if (route === 'clarify') {
        const isDocsQuery = containsDocsKeywords(pLower);
        const isTestsQuery = containsTestsKeywords(pLower);
        let msg = "I'd be happy to assist you! Could you please clarify which microservice target (Auth, Cart, Payment, or Order) you'd like to use?";
        if (isDocsQuery) {
          msg = "I can generate API documentation for you! Which microservice would you like to document: **Auth**, **Cart**, **Payment**, or **Order**?";
        } else if (isTestsQuery) {
          msg = "I can generate a test suite for you! Which microservice would you like to test: **Auth**, **Cart**, **Payment**, or **Order**?";
        }
        return res.json({
          success: true,
          route: 'clarify',
          message: msg
        });
      }

      if (route === 'docs') {
        const service = detectService(pLower)!;
        const systemInstruction = `You are a Documentation agent for a microservices API. Given an
endpoint's parameters and possible responses, write clear, concise
API documentation in Markdown. Include a one-line description, an
Authentication note if relevant, a Parameters list, and a Responses
list with status codes and their meaning.`;

        const serviceInfo = serviceEndpointsDetailed[service];
        const userMessage = `Generate the API documentation for the "${service}" Service using the following endpoint details:
${JSON.stringify(serviceInfo, null, 2)}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: userMessage,
          config: {
            systemInstruction,
          }
        });

        const markdown = response.text;
        if (!markdown) {
          throw new Error('Received empty response from the Documentation Agent.');
        }

        return res.json({
          success: true,
          route: 'docs',
          service,
          markdown
        });
      }

      if (route === 'tests') {
        const service = detectService(pLower)!;
        const systemInstruction = `You are a Test-Generator agent for a microservices API. Given an
endpoint's parameters and possible responses, generate a set of
3-5 test cases covering a successful case and realistic failure
cases (e.g. missing/invalid parameters, unauthorized access, a
server error). Respond ONLY with a JSON array, where each item has:
{ "name": string, "method": string, "url": string, "body": object,
  "headers": object, "expectedStatus": number }`;

        const serviceInfo = serviceEndpointsDetailed[service];
        const userMessage = `Generate a JSON test suite for the "${service}" Service using the following endpoint details:
${JSON.stringify(serviceInfo, null, 2)}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: userMessage,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  method: { type: Type.STRING },
                  url: { type: Type.STRING },
                  body: { type: Type.OBJECT, description: "Key-value map of request body payload, or empty object if not applicable." },
                  headers: { type: Type.OBJECT, description: "Key-value map of request headers, or empty object if not applicable." },
                  expectedStatus: { type: Type.INTEGER }
                },
                required: ['name', 'method', 'url', 'body', 'headers', 'expectedStatus']
              }
            }
          }
        });

        const responseText = response.text;
        if (!responseText) {
          throw new Error('Received empty response from the Test-Generator Agent.');
        }

        const tests = JSON.parse(responseText.trim());
        return res.json({
          success: true,
          route: 'tests',
          service,
          tests
        });
      }

      // Default: rca Route
      const dependencyChainStr = dependencyGraph
        ? JSON.stringify(dependencyGraph)
        : "Auth -> Cart -> Payment -> Order";

      const systemInstruction = `You are a Root-Cause Analysis agent for a microservices system.
Given recent log entries and the service dependency chain, identify
the root cause of any failure. Base your answer ONLY on the logs
provided — do not invent information not present in the logs. If there
is no error in the logs, say the system is healthy.
Respond ONLY with JSON in this shape:
{ "root_cause": string, "service": string, "symptom": string,
  "affected_services": string[], "suggested_fix": string, "confidence": number }`;

      const userMessage = `Service dependency chain: ${dependencyChainStr}

User question: "${promptStr || 'Why is checkout failing?'}"

Active Failure Injection Config: "${activeFailure}"

Here are the recent microservice log entries for analysis:
${JSON.stringify(recentLogs, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: userMessage,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              root_cause: { type: Type.STRING },
              service: { type: Type.STRING },
              symptom: { type: Type.STRING },
              affected_services: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              suggested_fix: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            },
            required: ['root_cause', 'service', 'symptom', 'affected_services', 'suggested_fix', 'confidence']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Received empty response from Gemini API.');
      }

      const diagnosis = JSON.parse(responseText.trim());
      res.json({ success: true, route: 'rca', diagnosis });
    } catch (error: any) {
      console.error('RCA Diagnosis Error:', error);
      res.status(500).json({ success: false, error: error.message || 'An error occurred during diagnosis.' });
    }
  });

  // 6d. API: Test-Generator Agent - Proxies to Gemini API for JSON Test Suite
  app.post('/api/tests', async (req, res) => {
    try {
      const { service } = req.body;
      if (!service || !serviceEndpointsDetailed[service as keyof typeof serviceEndpointsDetailed]) {
        return res.status(400).json({ success: false, error: 'Invalid or missing service name for generating tests.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.status(400).json({
          success: false,
          error: 'Gemini API Key is missing. Please add your GEMINI_API_KEY secret in the AI Studio Secrets panel.'
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `You are a Test-Generator agent for a microservices API. Given an
endpoint's parameters and possible responses, generate a set of
3-5 test cases covering a successful case and realistic failure
cases (e.g. missing/invalid parameters, unauthorized access, a
server error). Respond ONLY with a JSON array, where each item has:
{ "name": string, "method": string, "url": string, "body": object,
  "headers": object, "expectedStatus": number }`;

      const serviceInfo = serviceEndpointsDetailed[service as keyof typeof serviceEndpointsDetailed];
      const userMessage = `Generate a JSON test suite for the "${service}" Service using the following endpoint details:
${JSON.stringify(serviceInfo, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: userMessage,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                method: { type: Type.STRING },
                url: { type: Type.STRING },
                body: { type: Type.OBJECT, description: "Key-value map of request body payload, or empty object if not applicable." },
                headers: { type: Type.OBJECT, description: "Key-value map of request headers, or empty object if not applicable." },
                expectedStatus: { type: Type.INTEGER }
              },
              required: ['name', 'method', 'url', 'body', 'headers', 'expectedStatus']
            }
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Received empty response from the Test-Generator Agent.');
      }

      const tests = JSON.parse(responseText.trim());
      res.json({ success: true, service, tests });
    } catch (error: any) {
      console.error('Test-Generator Agent Error:', error);
      res.status(500).json({ success: false, error: error.message || 'An error occurred during test generation.' });
    }
  });

  // 6c. API: Documentation Agent - Proxies to Gemini API for Markdown Docs
  app.post('/api/docs', async (req, res) => {
    try {
      const { service } = req.body;
      if (!service || !serviceEndpointsDetailed[service as keyof typeof serviceEndpointsDetailed]) {
        return res.status(400).json({ success: false, error: 'Invalid or missing service name for generating documentation.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.status(400).json({
          success: false,
          error: 'Gemini API Key is missing. Please add your GEMINI_API_KEY secret in the AI Studio Secrets panel.'
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `You are a Documentation agent for a microservices API. Given an
endpoint's parameters and possible responses, write clear, concise
API documentation in Markdown. Include a one-line description, an
Authentication note if relevant, a Parameters list, and a Responses
list with status codes and their meaning.`;

      const serviceInfo = serviceEndpointsDetailed[service as keyof typeof serviceEndpointsDetailed];
      const userMessage = `Generate the API documentation for the "${service}" Service using the following endpoint details:
${JSON.stringify(serviceInfo, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: userMessage,
        config: {
          systemInstruction,
        }
      });

      const markdown = response.text;
      if (!markdown) {
        throw new Error('Received empty response from the Documentation Agent.');
      }

      res.json({ success: true, service, markdown });
    } catch (error: any) {
      console.error('Documentation Agent Error:', error);
      res.status(500).json({ success: false, error: error.message || 'An error occurred during API documentation generation.' });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[API Intelligence OS] Full-stack server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start full-stack server:', err);
});
