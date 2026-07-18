/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Terminal,
  Send,
  RefreshCw,
  Trash2,
  Sparkles,
  Search,
  Filter,
  Layers,
  FileText,
  ShoppingBag,
  ShieldAlert,
  Server,
  Database,
  ShoppingCart,
  Settings,
  Play,
  CheckCircle2,
  Code2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';
import { ServiceState, LogEvent, FailureType, ChatMessage, RcaDiagnosis, Product, CartItem, TestCase } from './types';

// Storefront components
import StorefrontHome from './components/StorefrontHome';
import StorefrontDetail from './components/StorefrontDetail';
import StorefrontCart from './components/StorefrontCart';
import StorefrontCheckout from './components/StorefrontCheckout';
import StorefrontProcessing from './components/StorefrontProcessing';
import StorefrontResult from './components/StorefrontResult';

function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  // Escaping html to prevent injection (since we trust Gemini, but it's good practice)
  let html = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Headers
  html = html.replace(/^### (.*?)$/gm, "<h4 class='text-sm font-bold text-slate-200 mt-4 mb-2 border-b border-slate-900 pb-1'>$1</h4>");
  html = html.replace(/^## (.*?)$/gm, "<h3 class='text-base font-bold text-slate-100 mt-5 mb-3 border-b border-slate-900 pb-1'>$1</h3>");
  html = html.replace(/^# (.*?)$/gm, "<h2 class='text-lg font-bold text-indigo-400 mt-6 mb-4'>$1</h2>");

  // Inline code
  html = html.replace(/`(.*?)`/g, "<code class='px-1.5 py-0.5 bg-slate-950/60 border border-slate-800/40 font-mono text-[11px] text-indigo-300 rounded'>$1</code>");

  // Code blocks (e.g. ```json ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="my-4 p-4 bg-slate-950 border border-slate-900 rounded-xl overflow-x-auto font-mono text-xs text-slate-300"><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // Unordered Lists
  html = html.replace(/^[-\*]\s+(.*?)$/gm, "<li class='list-disc ml-5 mb-1.5 text-slate-300'>$1</li>");
  
  // Wrap contiguous <li> tags in a <ul>
  html = html.replace(/(<li class='list-disc[\s\S]*?<\/li>)/g, "<ul class='space-y-1 my-3'>$1</ul>");
  // Clean up adjacent nested <ul>s
  html = html.replace(/<\/ul>\s*<ul class='space-y-1 my-3'>/g, "");

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.*?)$/gm, "<li class='list-decimal ml-5 mb-1.5 text-slate-300'>$1</li>");
  html = html.replace(/(<li class='list-decimal[\s\S]*?<\/li>)/g, "<ol class='space-y-1 my-3'>$1</ol>");
  html = html.replace(/<\/ol>\s*<ol class='space-y-1 my-3'>/g, "");

  // Paragraphs (split by double newlines)
  const lines = html.split(/\n{2,}/);
  const formattedLines = lines.map(line => {
    // If it's already a header, list, pre, ul, ol, don't wrap in <p>
    if (line.trim().startsWith("<h") || line.trim().startsWith("<ul") || line.trim().startsWith("<ol") || line.trim().startsWith("<pre") || line.trim().startsWith("<li")) {
      return line;
    }
    return `<p class="mb-4 text-xs text-slate-300 leading-relaxed">${line}</p>`;
  });

  return formattedLines.join("\n");
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'storefront' | 'dashboard' | 'devtools'>('storefront');
  const [services, setServices] = useState<ServiceState[]>([]);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [activeFailure, setActiveFailure] = useState<FailureType>('none');
  const [loading, setLoading] = useState<boolean>(true);

  // E-Commerce Storefront multi-stage pages routing state
  const [storefrontPage, setStorefrontPage] = useState<'home' | 'detail' | 'cart' | 'checkout' | 'processing' | 'result'>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Checkout outcomes
  const [isCheckoutSuccess, setIsCheckoutSuccess] = useState<boolean>(false);
  const [checkoutErrorMsg, setCheckoutErrorMsg] = useState<string>('');
  const [currentRequestLogs, setCurrentRequestLogs] = useState<LogEvent[]>([]);
  const [lastRequestID, setLastRequestID] = useState<string>('');

  // Logs filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('all');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');

  // Topology Discovery & Dependency Graph state
  const [dependencyGraph, setDependencyGraph] = useState<Record<string, string[]>>({
    Auth: [],
    Cart: ["Payment"],
    Payment: ["Order"],
    Order: []
  });
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  // Documentation Agent states
  const [selectedDocsService, setSelectedDocsService] = useState<'Auth' | 'Cart' | 'Payment' | 'Order'>('Auth');
  const [generatedDocs, setGeneratedDocs] = useState<Record<string, string>>({});
  const [isGeneratingDocs, setIsGeneratingDocs] = useState<boolean>(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [copiedService, setCopiedService] = useState<string | null>(null);

  const handleGenerateDocs = async () => {
    setIsGeneratingDocs(true);
    setDocsError(null);
    try {
      const res = await fetch('/api/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: selectedDocsService })
      });
      const data = await res.json();
      if (data.success && data.markdown) {
        setGeneratedDocs(prev => ({
          ...prev,
          [selectedDocsService]: data.markdown
        }));
      } else {
        throw new Error(data.error || 'Failed to generate API documentation.');
      }
    } catch (err: any) {
      console.error('Docs generation error:', err);
      setDocsError(err.message || 'Connection lost to Documentation agent.');
    } finally {
      setIsGeneratingDocs(false);
    }
  };

  // Test-Generator Agent states
  const [selectedTestService, setSelectedTestService] = useState<'Auth' | 'Cart' | 'Payment' | 'Order'>('Auth');
  const [generatedTests, setGeneratedTests] = useState<Record<string, TestCase[]>>({});
  const [isGeneratingTests, setIsGeneratingTests] = useState<boolean>(false);
  const [testsError, setTestsError] = useState<string | null>(null);
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});

  const toggleTestExpand = (key: string) => {
    setExpandedTests(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerateTests = async () => {
    setIsGeneratingTests(true);
    setTestsError(null);
    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: selectedTestService })
      });
      const data = await res.json();
      if (data.success && data.tests) {
        setGeneratedTests(prev => ({
          ...prev,
          [selectedTestService]: data.tests
        }));
      } else {
        throw new Error(data.error || 'Failed to generate JSON API test suite.');
      }
    } catch (err: any) {
      console.error('Test generation error:', err);
      setTestsError(err.message || 'Connection lost to Test-Generator agent.');
    } finally {
      setIsGeneratingTests(false);
    }
  };

  const mockEndpoints = {
    Auth: ["POST /auth/login", "GET /auth/user"],
    Cart: ["POST /cart/add", "POST /cart/checkout"],
    Payment: ["POST /payment/charge"],
    Order: ["POST /order/create"]
  };

  const serviceIdToKey: Record<string, string> = {
    auth: 'Auth',
    cart: 'Cart',
    payment: 'Payment',
    order: 'Order'
  };

  // Chat panel state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am the Root-Cause Analysis (RCA) agent for API Intelligence OS.\n\nI can analyze system logs, trace cascading microservice errors, and propose concrete architectural fixes. Try injecting a failure like the **Payment Database Pool Timeout**, run a checkout simulation in the Storefront to generate logs, and then ask me to diagnose!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isAgentThinking, setIsAgentThinking] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch status on mount
  useEffect(() => {
    fetchInitialData();
    // Start interval to poll stats every 3 seconds
    const interval = setInterval(() => {
      pollData();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom of chat when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAgentThinking]);

  const handleDiscoverTopology = async () => {
    setIsDiscovering(true);
    setDiscoveryError(null);
    try {
      const res = await fetch('/api/discover', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.graph) {
        setDependencyGraph(data.graph);
      } else {
        throw new Error(data.error || 'Failed to auto-discover services topology.');
      }
    } catch (err: any) {
      console.error('Topology Discovery error:', err);
      setDiscoveryError(err.message || 'Connection lost to Discovery agent.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const sRes = await fetch('/api/services');
      const sData = await sRes.json();
      if (sData.success) {
        setServices(sData.services);
        setActiveFailure(sData.activeFailure);
      }

      const lRes = await fetch('/api/logs');
      const lData = await lRes.json();
      if (lData.success) {
        setLogs(lData.logs);
      }

      // Automatically discover topology on load
      handleDiscoverTopology();
    } catch (err) {
      console.error('Error fetching system telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  const pollData = async () => {
    try {
      const sRes = await fetch('/api/services');
      const sData = await sRes.json();
      if (sData.success) {
        setServices(sData.services);
        setActiveFailure(sData.activeFailure);
      }

      const lRes = await fetch('/api/logs');
      const lData = await lRes.json();
      if (lData.success) {
        setLogs(lData.logs);
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  };

  const handleInjectFailure = async (type: FailureType) => {
    try {
      const res = await fetch('/api/failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if (data.success) {
        setActiveFailure(data.activeFailure);
        setServices(data.services);
      }
    } catch (err) {
      console.error('Error injecting failure:', err);
    }
  };

  // Cart operations
  const handleAddToCart = (product: Product, quantity: number) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const nextCart = [...prev];
        nextCart[existingIndex] = {
          ...nextCart[existingIndex],
          quantity: Math.min(nextCart[existingIndex].quantity + quantity, product.stock)
        };
        return nextCart;
      }
      return [...prev, { product, quantity }];
    });
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  // Place order triggers the backend checkout log generation
  const handlePlaceOrder = async (shippingDetails: any) => {
    setStorefrontPage('processing');
    setCheckoutErrorMsg('');
    setIsCheckoutSuccess(false);

    try {
      // 1. Submit checkout request to the backend simulator
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Checkout dispatch failed.');
      }

      const returnedLogs: LogEvent[] = data.logs;
      const newestLogs = [...returnedLogs];
      
      if (newestLogs.length === 0) {
        throw new Error('No logs returned from checkout execution.');
      }
      
      const currentReqId = newestLogs[0].requestId;
      setLastRequestID(currentReqId);
      
      // Filter logs belonging strictly to this run
      const thisRunLogs = newestLogs.filter(l => l.requestId === currentReqId);
      setCurrentRequestLogs(thisRunLogs);

      // Trigger telemetry updates instantly so DevOps logs reflect immediately
      setLogs(returnedLogs);
      setServices(data.services);

    } catch (err: any) {
      console.error('Error during purchase dispatch:', err);
      setCheckoutErrorMsg(err.message || 'An unexpected failure occurred.');
      setStorefrontPage('result');
      setIsCheckoutSuccess(false);
    }
  };

  const handleSimulationComplete = (success: boolean, errorMsg: string) => {
    setIsCheckoutSuccess(success);
    setCheckoutErrorMsg(errorMsg);
    setStorefrontPage('result');
    if (success) {
      setCart([]); // Clear cart upon successful transaction!
    }
  };

  const handleAskAIFromFailure = (errorContext: string) => {
    setActiveTab('dashboard');
    const diagnosticQuery = `Why did checkout fail with: "${errorContext}"? Diagnose current logs on Request ID ${lastRequestID || 'latest'}.`;
    handleSendMessage(diagnosticQuery);
  };

  const handleResetSystem = async () => {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setServices(data.services);
        setActiveFailure('none');
        setStorefrontPage('home');
        setSelectedProduct(null);
        setCart([]);
        setCurrentRequestLogs([]);
        setCheckoutErrorMsg('');
      }
    } catch (err) {
      console.error('Error resetting simulator:', err);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim()) return;

    // Add user message to history
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputMessage('');
    setIsAgentThinking(true);
    setApiError(null);

    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend, dependencyGraph })
      });
      const data = await res.json();

      if (data.success) {
        let assistantMsg: ChatMessage;

        if (data.route === 'clarify') {
          assistantMsg = {
            id: `agent-${Date.now()}`,
            role: 'assistant',
            content: data.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        } else if (data.route === 'docs') {
          assistantMsg = {
            id: `agent-${Date.now()}`,
            role: 'assistant',
            content: `Here is the API documentation for the **${data.service}** Service:\n\n${data.markdown}`,
            isDocs: true,
            service: data.service,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        } else if (data.route === 'tests') {
          assistantMsg = {
            id: `agent-${Date.now()}`,
            role: 'assistant',
            content: `I've generated a JSON test suite with ${data.tests.length} cases for the **${data.service}** Service! Below is the test plan:`,
            isTests: true,
            tests: data.tests,
            service: data.service,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        } else {
          // Default or rca route
          assistantMsg = {
            id: `agent-${Date.now()}`,
            role: 'assistant',
            content: formatTextDiagnosis(data.diagnosis),
            diagnosis: data.diagnosis,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        }

        setChatMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || 'The diagnosis agent could not generate a response.');
      }
    } catch (err: any) {
      console.error('Error from RCA agent:', err);
      setApiError(err.message || 'Connection lost to RCA server.');
      // Add a fall-back helper message
      const errorMsg: ChatMessage = {
        id: `agent-error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Diagnostic Pipeline Error**: ${err.message || 'Failed to complete analysis.'}\n\n*Make sure you have specified your GEMINI_API_KEY in the Secrets menu of AI Studio.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAgentThinking(false);
    }
  };

  // Human readable text formatter for the diagnosis response
  const formatTextDiagnosis = (d: RcaDiagnosis): string => {
    if (d.root_cause === 'NoFailureDetected' || d.root_cause.toLowerCase() === 'healthy') {
      return "💚 **Analysis Complete**: All microservices are operating in a healthy state. The transaction log verifies standard 2xx/201 response boundaries, and average latencies are well within optimal bounds.";
    }
    return `🔍 **Root Cause Identified**: \`${d.root_cause}\` inside the **${d.service}**.

🚨 **Symptom**: ${d.symptom}
🌐 **Affected Upstream Cascades**: ${d.affected_services.join(', ') || 'None'}
🛠️ **Remediation Fix**: ${d.suggested_fix} (Confidence: ${Math.round(d.confidence * 100)}%)`;
  };

  // Dynamically calculate the service health card states strictly based on whether their MOST RECENT log event was an error!
  const getServiceStatusFromLogs = (svcId: string): 'healthy' | 'down' => {
    const serviceNameMap: Record<string, string> = {
      auth: 'Auth',
      cart: 'Cart',
      payment: 'Payment',
      order: 'Order'
    };
    const mappedName = serviceNameMap[svcId] || svcId;
    const serviceLogs = logs.filter(l => l.service.toLowerCase() === mappedName.toLowerCase());
    
    if (serviceLogs.length === 0) return 'healthy';
    
    // Check level of the most recent log (index 0 is newest)
    return serviceLogs[0].level === 'error' ? 'down' : 'healthy';
  };

  // Filtering logs
  const filteredLogs = logs.filter((log) => {
    // 1. Service filter
    if (selectedServiceFilter !== 'all' && log.service.toLowerCase() !== selectedServiceFilter.toLowerCase()) {
      return false;
    }
    // 2. Level filter
    if (selectedLevelFilter !== 'all' && log.level.toLowerCase() !== selectedLevelFilter.toLowerCase()) {
      return false;
    }
    // 3. Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.service.toLowerCase().includes(q) ||
        log.requestId.toLowerCase().includes(q) ||
        (log.statusCode && log.statusCode.toString().includes(q))
      );
    }
    return true;
  });

  const getStatusColor = (status: 'healthy' | 'down') => {
    return status === 'healthy'
      ? 'bg-emerald-500 shadow-emerald-500/20 text-emerald-400 border-emerald-500/30'
      : 'bg-rose-500 shadow-rose-500/20 text-rose-400 border-rose-500/30';
  };

  const getLogLevelStyle = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-rose-950/40 text-rose-400 border-rose-800/40';
      case 'warn':
        return 'bg-amber-950/40 text-amber-400 border-amber-800/40';
      default:
        return 'bg-slate-900/60 text-slate-300 border-slate-800/30';
    }
  };

  const selectSuggestedQuestion = (question: string) => {
    handleSendMessage(question);
  };

  const totalCartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3" id="app-header-left">
          <div className="p-2.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <Activity className="h-6 w-6 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-display font-semibold tracking-tight text-white flex items-center">
              API Intelligence OS
              <span className="ml-2.5 px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
                Developer Lab v1.2
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-sans">Multi-Agent Diagnostics &amp; RCA Orchestrator</p>
          </div>
        </div>

        {/* Header Actions / Cart status */}
        <div className="flex items-center space-x-3" id="app-header-right">
          {activeTab === 'storefront' && (
            <button
              onClick={() => setStorefrontPage('cart')}
              className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-900 rounded-xl transition-all flex items-center space-x-2 cursor-pointer"
            >
              <ShoppingCart className="h-4.5 w-4.5" />
              {totalCartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-indigo-600 text-white font-mono text-[10px] font-bold rounded-full flex items-center justify-center border border-slate-950">
                  {totalCartItemCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={handleResetSystem}
            className="flex items-center space-x-2 px-3 py-2 text-xs font-display font-medium text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-900 hover:border-slate-800 rounded-xl transition-all cursor-pointer"
            title="Reset simulation telemetry and logs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset Lab</span>
          </button>
        </div>
      </header>

      {/* Main Multi-Tab Navigation */}
      <div className="bg-slate-900/40 border-b border-slate-900 sticky top-[73px] z-40 backdrop-blur-md px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <nav className="flex space-x-1 py-3" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('storefront')}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-display font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === 'storefront'
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>🛍️ Storefront Portal</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-display font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>⚙️ DevOps Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('devtools')}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-display font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === 'devtools'
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              <span>🛠️ Dev Tools</span>
            </button>
          </nav>

          {/* Quick status indicator */}
          <div className="hidden md:flex items-center space-x-3 text-xs font-mono">
            <span className="text-slate-500">Telemetry Link:</span>
            <span className="flex items-center text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping mr-2" />
              Listening
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'storefront' ? (
          /* ==================== TAB 1: STOREFRONT PORTAL ==================== */
          <div className="space-y-6" id="ecommerce-storefront-wrapper">
            <AnimatePresence mode="wait">
              {storefrontPage === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <StorefrontHome
                    onSelectProduct={(p) => {
                      setSelectedProduct(p);
                      setStorefrontPage('detail');
                    }}
                    onNavigateToCart={() => setStorefrontPage('cart')}
                    cartItemCount={totalCartItemCount}
                  />
                </motion.div>
              )}

              {storefrontPage === 'detail' && selectedProduct && (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <StorefrontDetail
                    product={selectedProduct}
                    onBack={() => setStorefrontPage('home')}
                    onAddToCart={(p, qty) => handleAddToCart(p, qty)}
                  />
                </motion.div>
              )}

              {storefrontPage === 'cart' && (
                <motion.div
                  key="cart"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <StorefrontCart
                    cart={cart}
                    onRemoveItem={handleRemoveCartItem}
                    onUpdateQuantity={handleUpdateCartQuantity}
                    onBack={() => setStorefrontPage('home')}
                    onCheckout={() => setStorefrontPage('checkout')}
                  />
                </motion.div>
              )}

              {storefrontPage === 'checkout' && (
                <motion.div
                  key="checkout"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <StorefrontCheckout
                    cart={cart}
                    onBack={() => setStorefrontPage('cart')}
                    onPlaceOrder={handlePlaceOrder}
                  />
                </motion.div>
              )}

              {storefrontPage === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <StorefrontProcessing
                    logs={currentRequestLogs}
                    activeFailure={activeFailure}
                    onComplete={handleSimulationComplete}
                  />
                </motion.div>
              )}

              {storefrontPage === 'result' && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <StorefrontResult
                    isSuccess={isCheckoutSuccess}
                    errorMsg={checkoutErrorMsg}
                    orderId={lastRequestID}
                    onRestart={() => setStorefrontPage('home')}
                    onAskAI={handleAskAIFromFailure}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : activeTab === 'dashboard' ? (
          /* ==================== TAB 2: DEVOPS TELEMETRY DASHBOARD ==================== */
          <div className="space-y-6" id="devops-telemetry-dashboard-layout">
            
            {/* Health Dashboard per service cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="service-health-cards-grid">
              {['auth', 'cart', 'payment', 'order'].map((svcId) => {
                const computedStatus = getServiceStatusFromLogs(svcId);
                const statusColor = getStatusColor(computedStatus);
                const svcName = svcId === 'auth' ? 'Auth Service' : svcId === 'cart' ? 'Cart Service' : svcId === 'payment' ? 'Payment Service' : 'Order Service';
                
                // Find latest log for stats
                const svcLogs = logs.filter(l => l.service.toLowerCase() === svcId);
                const latestLogText = svcLogs.length > 0 ? svcLogs[0].message : 'Healthy telemetry standby.';
                const timestampText = svcLogs.length > 0 ? new Date(svcLogs[0].timestamp).toLocaleTimeString() : 'N/A';

                return (
                  <button
                    key={svcId}
                    onClick={() => setSelectedServiceFilter(svcId)}
                    className={`text-left bg-slate-900/40 hover:bg-slate-900/60 border border-slate-900 rounded-xl p-4 transition-all relative overflow-hidden cursor-pointer group ${
                      selectedServiceFilter === svcId ? 'border-indigo-500/60 shadow-md shadow-indigo-950/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="p-1.5 bg-slate-950 rounded-md border border-slate-800 text-slate-400 group-hover:text-indigo-400 transition-colors">
                        {svcId === 'payment' ? <Database className="h-4.5 w-4.5" /> : <Server className="h-4.5 w-4.5" />}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-mono uppercase font-semibold tracking-wider rounded border ${statusColor}`}>
                        <span className="h-1 w-1 rounded-full bg-current mr-1" />
                        {computedStatus === 'healthy' ? 'healthy' : 'down'}
                      </span>
                    </div>

                    <h3 className="text-xs font-display font-semibold text-white">
                      {svcName}
                    </h3>
                    
                    <p className="text-[10px] text-slate-400 mt-2 truncate leading-tight">
                      {latestLogText}
                    </p>
                    <div className="text-[8px] font-mono text-slate-600 mt-1.5 flex items-center justify-between">
                      <span>Latest: {timestampText}</span>
                      <span>Logs count: {svcLogs.length}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Service Topology & Dependency Graph Visualizer Card */}
            {(() => {
              const failedServiceIds = ['auth', 'cart', 'payment', 'order'].filter(
                id => getServiceStatusFromLogs(id) === 'down'
              );
              const failedKeys = failedServiceIds.map(id => serviceIdToKey[id]);

              const getBlastRadiusKeys = (graph: Record<string, string[]>, startKeys: string[]): Set<string> => {
                const visited = new Set<string>();
                const dfs = (key: string) => {
                  const normalizedKey = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
                  if (visited.has(normalizedKey)) return;
                  visited.add(normalizedKey);
                  
                  const match = Object.keys(graph).find(k => k.toLowerCase() === normalizedKey.toLowerCase());
                  const downstream = match ? graph[match] : [];
                  for (const next of downstream) {
                    dfs(next);
                  }
                };
                for (const key of startKeys) {
                  dfs(key);
                }
                return visited;
              };

              const blastRadiusKeys = getBlastRadiusKeys(dependencyGraph, failedKeys);

              const nodePositions: Record<string, { x: number; y: number }> = {
                Auth: { x: 100, y: 80 },
                Cart: { x: 300, y: 80 },
                Payment: { x: 500, y: 80 },
                Order: { x: 700, y: 80 }
              };

              const boxWidth = 140;
              const boxHeight = 76;

              return (
                <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5" id="topology-graph-card">
                  <style>{`
                    @keyframes flowDash {
                      to {
                        stroke-dashoffset: -20;
                      }
                    }
                    .flowing-edge {
                      animation: flowDash 1.2s linear infinite;
                    }
                  `}</style>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-900 mb-6 gap-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-display uppercase tracking-wider font-semibold text-slate-300">
                          Discovery Agent &amp; Service Topology
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          AI-driven automatic topology discovery with active propagation blast-radius tracking
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-end sm:self-auto">
                      {discoveryError && (
                        <span className="text-rose-400 text-xs font-mono mr-2">
                          ⚠️ {discoveryError}
                        </span>
                      )}
                      <button
                        onClick={handleDiscoverTopology}
                        disabled={isDiscovering}
                        className="flex items-center space-x-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg border border-indigo-500/30 disabled:opacity-50 transition-all text-xs font-medium cursor-pointer"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
                        <span>{isDiscovering ? 'Discovering...' : 'Refresh Topology'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* Left: The interactive dependency graph */}
                    <div className="lg:col-span-8 flex flex-col items-center justify-center">
                      <div className="w-full overflow-x-auto custom-scrollbar">
                        <svg className="w-full min-w-[760px] h-[170px] bg-slate-950/40 border border-slate-900/60 rounded-xl" viewBox="0 0 800 160">
                          <defs>
                            <marker id="arrow-default" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#4f46e5" />
                            </marker>
                            <marker id="arrow-failed" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ef4444" />
                            </marker>
                          </defs>

                          {/* Render Arrows */}
                          {Object.entries(nodePositions).map(([fromKey, fromCoord]) => {
                            const match = Object.keys(dependencyGraph).find(k => k.toLowerCase() === fromKey.toLowerCase());
                            const downstream = match ? dependencyGraph[match] : [];

                            return downstream.map((toKey) => {
                              const targetMatch = Object.keys(nodePositions).find(k => k.toLowerCase() === toKey.toLowerCase());
                              const toCoord = targetMatch ? nodePositions[targetMatch] : null;

                              if (!fromCoord || !toCoord) return null;

                              let startX = fromCoord.x + boxWidth / 2;
                              let startY = fromCoord.y;
                              let endX = toCoord.x - boxWidth / 2;
                              let endY = toCoord.y;

                              const isSkipping = Math.abs(toCoord.x - fromCoord.x) > 250;
                              const isReverse = toCoord.x < fromCoord.x;

                              const isFromAffected = blastRadiusKeys.has(fromKey);
                              const isEdgeRed = isFromAffected;

                              let pathD = "";
                              if (isSkipping) {
                                const ctrlX = (startX + endX) / 2;
                                const ctrlY = fromCoord.y - 45;
                                pathD = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
                              } else if (isReverse) {
                                startX = fromCoord.x - boxWidth / 2;
                                endX = toCoord.x + boxWidth / 2;
                                const ctrlX = (startX + endX) / 2;
                                const ctrlY = fromCoord.y + 45;
                                pathD = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
                              } else {
                                pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
                              }

                              return (
                                <g key={`${fromKey}-${toKey}`}>
                                  <path
                                    d={pathD}
                                    fill="none"
                                    stroke={isEdgeRed ? "#ef4444" : "#4f46e5"}
                                    strokeWidth={isEdgeRed ? 4 : 2}
                                    strokeOpacity={isEdgeRed ? 0.15 : 0.05}
                                  />
                                  <path
                                    d={pathD}
                                    fill="none"
                                    stroke={isEdgeRed ? "#ef4444" : "#4f46e5"}
                                    strokeWidth={isEdgeRed ? 2.5 : 1.5}
                                    markerEnd={isEdgeRed ? "url(#arrow-failed)" : "url(#arrow-default)"}
                                    strokeDasharray={isEdgeRed ? "6,4" : "none"}
                                    className={isEdgeRed ? "flowing-edge" : ""}
                                  />
                                </g>
                              );
                            });
                          })}

                          {/* Render Service Nodes */}
                          {Object.entries(nodePositions).map(([key, coords]) => {
                            const isFailed = failedKeys.includes(key);
                            const isAffected = blastRadiusKeys.has(key) && !isFailed;
                            const isHealthy = !isFailed && !isAffected;

                            let strokeColor = "#334155";
                            let fillColor = "#020617";
                            let titleColor = "#94a3b8";
                            let statusText = "STANDBY";
                            let statusColor = "#64748b";
                            let shadowFilter = "";

                            if (isFailed) {
                              strokeColor = "#f43f5e";
                              fillColor = "#1e1b4b";
                              titleColor = "#fda4af";
                              statusText = "🚨 FAILED";
                              statusColor = "#f43f5e";
                              shadowFilter = "drop-shadow(0px 0px 8px rgba(244, 63, 94, 0.4))";
                            } else if (isAffected) {
                              strokeColor = "#f59e0b";
                              fillColor = "#1c1917";
                              titleColor = "#fde047";
                              statusText = "⚠️ CASCADE";
                              statusColor = "#f59e0b";
                              shadowFilter = "drop-shadow(0px 0px 6px rgba(245, 158, 11, 0.25))";
                            } else if (isHealthy) {
                              strokeColor = "#10b981";
                              fillColor = "#022c22";
                              titleColor = "#a7f3d0";
                              statusText = "🟢 OK";
                              statusColor = "#34d399";
                              shadowFilter = "drop-shadow(0px 0px 4px rgba(16, 185, 129, 0.15))";
                            }

                            const endpoints = mockEndpoints[key as keyof typeof mockEndpoints] || [];
                            const primaryEndpoint = endpoints[0] || "";

                            return (
                              <g key={key} style={{ filter: shadowFilter }} className="transition-all duration-300">
                                <rect
                                  x={coords.x - boxWidth / 2}
                                  y={coords.y - boxHeight / 2}
                                  width={boxWidth}
                                  height={boxHeight}
                                  rx={10}
                                  fill={fillColor}
                                  stroke={strokeColor}
                                  strokeWidth={isFailed || isAffected ? 2 : 1.2}
                                  className={isFailed ? "animate-pulse" : ""}
                                />
                                <text
                                  x={coords.x}
                                  y={coords.y - 12}
                                  textAnchor="middle"
                                  fill={titleColor}
                                  fontSize="11"
                                  fontWeight="bold"
                                  fontFamily="sans-serif"
                                >
                                  {key} Service
                                </text>
                                <text
                                  x={coords.x}
                                  y={coords.y + 8}
                                  textAnchor="middle"
                                  fill={statusColor}
                                  fontSize="9"
                                  fontWeight="600"
                                  fontFamily="monospace"
                                >
                                  {statusText}
                                </text>
                                <text
                                  x={coords.x}
                                  y={coords.y + 24}
                                  textAnchor="middle"
                                  fill="#475569"
                                  fontSize="8"
                                  fontFamily="monospace"
                                >
                                  {primaryEndpoint}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    </div>

                    {/* Right: Endpoint Configuration registry */}
                    <div className="lg:col-span-4 self-stretch flex flex-col justify-between bg-slate-950/40 border border-slate-900/60 rounded-xl p-4">
                      <div>
                        <div className="flex items-center space-x-2 pb-2.5 border-b border-slate-900 mb-3">
                          <Terminal className="h-4 w-4 text-slate-400" />
                          <h3 className="text-xs font-display uppercase tracking-wider font-bold text-slate-300">
                            Service API Registry
                          </h3>
                        </div>
                        
                        <div className="space-y-3">
                          {Object.entries(mockEndpoints).map(([svc, endpointsList]) => {
                            return (
                              <div key={svc} className="text-[11px]">
                                <div className="font-semibold text-slate-400 mb-1">{svc} Endpoints</div>
                                <div className="space-y-1 font-mono">
                                  {endpointsList.map((ep) => {
                                    const isPost = ep.startsWith("POST");
                                    const method = isPost ? "POST" : "GET";
                                    const path = ep.replace(`${method} `, "");
                                    return (
                                      <div key={ep} className="flex items-center space-x-1.5 text-[10px]">
                                        <span className={`px-1 rounded text-[8px] font-bold leading-none py-0.5 ${
                                          isPost 
                                            ? 'bg-purple-950/45 text-purple-400 border border-purple-800/20' 
                                            : 'bg-blue-950/45 text-blue-400 border border-blue-800/20'
                                        }`}>
                                          {method}
                                        </span>
                                        <span className="text-slate-300">{path}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-slate-900/60 text-[10px] text-slate-500 leading-normal flex items-start space-x-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <span>
                          Discovery agent triggers automatically on boot. It reads this local registry to construct the active operational dependency graph.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Core Diagnostics Split: Logs & Injector + RCA AI chat */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="ops-split-layout">
              
              {/* Logs Console Panel */}
              <div className="lg:col-span-7 bg-slate-900/40 border border-slate-900 rounded-xl p-5 flex flex-col h-[520px]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-900 space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-2">
                    <Terminal className="h-5 w-5 text-indigo-400" />
                    <h2 className="text-sm font-display uppercase tracking-wider font-semibold text-slate-300">
                      Operations Log Console
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-950 text-slate-400 rounded-full border border-slate-900">
                      {filteredLogs.length} events
                    </span>
                  </div>

                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Filter logs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 text-xs text-white rounded-lg focus:outline-none focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Filtering Bar */}
                <div className="flex flex-wrap items-center gap-2 py-3 border-b border-slate-900/60 text-xs">
                  <span className="text-slate-500 flex items-center text-[10px] uppercase font-mono mr-1">
                    <Filter className="h-3 w-3 mr-1" /> Filters:
                  </span>

                  <select
                    value={selectedServiceFilter}
                    onChange={(e) => setSelectedServiceFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-mono rounded px-2.5 py-1 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">All Services</option>
                    <option value="auth">Auth Service</option>
                    <option value="cart">Cart Service</option>
                    <option value="payment">Payment Service</option>
                    <option value="order">Order Service</option>
                  </select>

                  <select
                    value={selectedLevelFilter}
                    onChange={(e) => setSelectedLevelFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-mono rounded px-2.5 py-1 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">All Levels</option>
                    <option value="info">INFO</option>
                    <option value="warn">WARN</option>
                    <option value="error">ERROR</option>
                  </select>

                  {(selectedServiceFilter !== 'all' || selectedLevelFilter !== 'all' || searchQuery !== '') && (
                    <button
                      onClick={() => {
                        setSelectedServiceFilter('all');
                        setSelectedLevelFilter('all');
                        setSearchQuery('');
                      }}
                      className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 ml-auto"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>

                {/* Logs Terminal Loop */}
                <div className="flex-1 overflow-y-auto mt-4 font-mono text-xs space-y-2.5 pr-2 custom-scrollbar">
                  {filteredLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6">
                      <FileText className="h-8 w-8 text-slate-600 mb-2" />
                      <p>No telemetry traces match filters.</p>
                    </div>
                  ) : (
                    filteredLogs.map((log) => {
                      const levelStyle = getLogLevelStyle(log.level);
                      return (
                        <div
                          key={log.id}
                          className={`p-2.5 border rounded-lg transition-all flex flex-col md:flex-row md:items-start justify-between gap-2 border-slate-900/60 ${levelStyle}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 text-[10px] text-slate-500 mb-1">
                              <span className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                              <span>•</span>
                              <span className="font-semibold text-slate-300 uppercase tracking-wide">{log.service}</span>
                              <span>•</span>
                              <span className="bg-slate-950 text-[9px] px-1.5 py-0.2 rounded text-slate-400 font-mono">{log.requestId}</span>
                              {log.statusCode && (
                                <>
                                  <span>•</span>
                                  <span className={`px-1 rounded font-semibold text-[9px] ${
                                    log.statusCode >= 500 ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'
                                  }`}>
                                    HTTP {log.statusCode}
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="text-slate-200 text-[11px] leading-relaxed break-all">{log.message}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>

              {/* RCA AI Assistant Chat & Injector Side Panel */}
              <div className="lg:col-span-5 flex flex-col justify-between h-[520px] space-y-4">
                
                {/* Embedded Failure Injector Card */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-4 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <ShieldAlert className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-display uppercase tracking-wider font-bold text-slate-300">
                        Failure Injector
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">ADMIN CONTROLS</span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <select
                      value={activeFailure}
                      onChange={(e) => handleInjectFailure(e.target.value as FailureType)}
                      className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono rounded-lg px-3 py-2 w-full focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="none">Inject Failure: None</option>
                      <option value="payment_db_timeout">Inject Failure: Payment DB Timeout (504)</option>
                      <option value="auth_expired_token">Inject Failure: Auth Token Expired (401)</option>
                      <option value="cart_rate_limit">Inject Failure: Cart Rate Limit (429)</option>
                      <option value="order_disk_full">Inject Failure: Order Disk Full (500)</option>
                    </select>
                  </div>
                </div>

                {/* RCA Chat Module */}
                <div className="flex-1 bg-slate-900/40 border border-slate-900 rounded-xl p-5 flex flex-col h-[340px]">
                  <div className="flex items-center space-x-2 pb-3 border-b border-slate-900">
                    <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
                    <div>
                      <h2 className="text-xs font-display uppercase tracking-wider font-semibold text-slate-300">
                        AI Diagnosis Chat
                      </h2>
                    </div>
                  </div>

                  {/* Messages Bubble Frame */}
                  <div className="flex-1 overflow-y-auto mt-3 space-y-3 pr-1 scrollbar-thin custom-scrollbar">
                    {chatMessages.map((msg) => {
                      const isBot = msg.role === 'assistant';
                      return (
                        <div key={msg.id} className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}>
                          <span className="text-[8px] text-slate-500 mb-0.5 font-mono">
                            {isBot ? 'RCA_AGENT' : 'DEV'} • {msg.timestamp}
                          </span>
                          <div className={`p-3 rounded-lg border text-[11px] leading-normal ${
                            isBot ? 'bg-slate-950/80 text-slate-200 border-slate-900' : 'bg-indigo-600/20 text-white border-indigo-500/20'
                          }`}>
                            {isBot && msg.isDocs ? (
                              <div 
                                className="markdown-body mt-1 text-slate-300 space-y-1"
                                dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(msg.content) }}
                              />
                            ) : (
                              <p className="whitespace-pre-line">{msg.content}</p>
                            )}

                            {/* If it's a test generation response, render a compact test plan */}
                            {isBot && msg.isTests && msg.tests && (
                              <div className="mt-3 space-y-2 border-t border-slate-900 pt-3">
                                <div className="max-h-60 overflow-y-auto space-y-1.5 scrollbar-thin">
                                  {msg.tests.map((test, idx) => (
                                    <div key={idx} className="bg-slate-950 p-2 rounded border border-slate-900/60 flex flex-col gap-1 text-[10px] w-full min-w-[200px]">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-300 truncate max-w-[130px]">{test.name}</span>
                                        <span className={`px-1.5 py-0.2 rounded-full font-semibold text-[8px] uppercase ${
                                          test.expectedStatus >= 400 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                                        }`}>
                                          Exp {test.expectedStatus}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-1.5 font-mono text-[9px] text-indigo-300">
                                        <span className="bg-indigo-950/45 px-1 rounded uppercase font-bold text-[8px]">{test.method}</span>
                                        <span className="text-slate-400 truncate">{test.url}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Structured confidence dial */}
                            {isBot && msg.diagnosis && (
                              <div className="mt-3 pt-3 border-t border-slate-900 space-y-2">
                                <div className="flex items-center justify-between text-[9px] font-mono">
                                  <span className="text-slate-500">Confidence:</span>
                                  <span className="text-indigo-400 font-bold">{Math.round(msg.diagnosis.confidence * 100)}%</span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-1 border border-slate-800">
                                  <div
                                    className="h-full bg-indigo-500 rounded-full"
                                    style={{ width: `${msg.diagnosis.confidence * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {isAgentThinking && (
                      <div className="flex flex-col items-start">
                        <span className="text-[8px] text-slate-500 mb-0.5 font-mono">Analyzing...</span>
                        <div className="bg-slate-950/80 border border-slate-900 p-3 rounded-lg flex items-center space-x-2 text-[11px] text-slate-400">
                          <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
                          <span>Executing LLM RCA diagnostic...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Suggestion tags */}
                  <div className="py-2 flex flex-wrap gap-1 border-t border-slate-900 text-[9px] mt-2">
                    <button
                      onClick={() => selectSuggestedQuestion('Why is checkout failing?')}
                      disabled={isAgentThinking}
                      className="bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-400 px-2 py-0.5 rounded cursor-pointer"
                    >
                      Why is checkout failing?
                    </button>
                    <button
                      onClick={() => selectSuggestedQuestion('Are services healthy?')}
                      disabled={isAgentThinking}
                      className="bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-400 px-2 py-0.5 rounded cursor-pointer"
                    >
                      Are services healthy?
                    </button>
                  </div>

                  {/* Message Input box */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="mt-2 flex items-center space-x-2"
                  >
                    <input
                      type="text"
                      placeholder="Ask RCA agent: 'Explain checkout failure'..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      disabled={isAgentThinking}
                      className="flex-1 bg-slate-950 border border-slate-800 text-[11px] text-white rounded-lg px-2.5 py-2 focus:outline-none focus:border-indigo-500 transition-all disabled:opacity-50 font-sans"
                    />
                    <button
                      type="submit"
                      disabled={isAgentThinking || !inputMessage.trim()}
                      className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg border border-indigo-500/30 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>

              </div>

            </div>
          </div>
        ) : (
          /* ==================== TAB 3: DEV TOOLS / ADMIN ==================== */
          <div className="space-y-6 animate-fadeIn" id="devtools-tab-layout">
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-6" id="devtools-main-card">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-900 mb-6">
                <div className="p-2.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-display uppercase tracking-wider font-semibold text-slate-200">
                    System Administration &amp; Failure Injection
                  </h2>
                  <p className="text-xs text-slate-400">
                    Simulate real-world cloud failures, timeouts, and resource exhaustions to test microservice resiliency
                  </p>
                </div>
              </div>

              {/* Status banner */}
              <div className={`p-4 rounded-xl border mb-8 flex items-center justify-between transition-all ${
                activeFailure === 'none' 
                  ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300' 
                  : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${activeFailure === 'none' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-ping'}`} />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide">
                      Active Injection: <span className="font-mono bg-slate-950/60 px-2 py-0.5 rounded ml-1 border border-slate-800/40">{activeFailure.toUpperCase()}</span>
                    </div>
                    <p className="text-[11px] opacity-85 mt-1">
                      {activeFailure === 'none' 
                        ? '🟢 All systems operating normally. End-to-end checkout transactions will succeed.' 
                        : `🚨 Failure Mode Triggered: ${
                            activeFailure === 'payment_db_timeout' 
                              ? 'Payment Database Connection Timeout (504). Downstream Order service creation will be skipped.' 
                              : activeFailure === 'auth_expired_token'
                              ? 'Auth Token Signature Expired (401). Downstream Cart and Payment flows will be aborted.'
                              : activeFailure === 'cart_rate_limit'
                              ? 'Cart Service Rate Limit Exceeded (429). Missing payload validation will halt checkout.'
                              : 'Order Master Storage Disk Full (500). System fail-safe write protection triggered.'
                          }`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Inject Failure Control */}
              <div className="space-y-4">
                <h3 className="text-xs font-display uppercase tracking-wider font-bold text-slate-400">
                  Select failure scenario to inject:
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* None Option */}
                  <button
                    onClick={() => handleInjectFailure('none')}
                    className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      activeFailure === 'none'
                        ? 'bg-emerald-600/10 border-emerald-500/40 ring-1 ring-emerald-500/20'
                        : 'bg-slate-950/55 border-slate-900 hover:border-slate-800 hover:bg-slate-950/80'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center space-x-2">
                        <Activity className={`h-4 w-4 ${activeFailure === 'none' ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-white">None (Healthy Flow)</span>
                      </div>
                      <input
                        type="radio"
                        checked={activeFailure === 'none'}
                        readOnly
                        className="accent-emerald-500 h-3.5 w-3.5 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Reset simulation telemetry and operational variables to green. All HTTP request actions will succeed.
                    </p>
                  </button>

                  {/* Payment DB Timeout Option */}
                  <button
                    onClick={() => handleInjectFailure('payment_db_timeout')}
                    className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      activeFailure === 'payment_db_timeout'
                        ? 'bg-rose-600/10 border-rose-500/40 ring-1 ring-rose-500/20'
                        : 'bg-slate-950/55 border-slate-900 hover:border-slate-800 hover:bg-slate-950/80'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center space-x-2">
                        <Database className={`h-4 w-4 ${activeFailure === 'payment_db_timeout' ? 'text-rose-400' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-white">Payment DB Timeout (504)</span>
                      </div>
                      <input
                        type="radio"
                        checked={activeFailure === 'payment_db_timeout'}
                        readOnly
                        className="accent-rose-500 h-3.5 w-3.5 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Triggers PostgreSQL pool exhaustion on card processing. Cart and Auth succeed; Payment fails with 504.
                    </p>
                  </button>

                  {/* Auth Expired Token Option */}
                  <button
                    onClick={() => handleInjectFailure('auth_expired_token')}
                    className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      activeFailure === 'auth_expired_token'
                        ? 'bg-rose-600/10 border-rose-500/40 ring-1 ring-rose-500/20'
                        : 'bg-slate-950/55 border-slate-900 hover:border-slate-800 hover:bg-slate-950/80'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center space-x-2">
                        <Server className={`h-4 w-4 ${activeFailure === 'auth_expired_token' ? 'text-rose-400' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-white">Auth Token Expired (401)</span>
                      </div>
                      <input
                        type="radio"
                        checked={activeFailure === 'auth_expired_token'}
                        readOnly
                        className="accent-rose-500 h-3.5 w-3.5 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Simulates JWT authorization expiry. Auth microservice fails immediately, aborting the checkout flow cascade.
                    </p>
                  </button>

                  {/* Cart Rate Limit Option */}
                  <button
                    onClick={() => handleInjectFailure('cart_rate_limit')}
                    className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      activeFailure === 'cart_rate_limit'
                        ? 'bg-rose-600/10 border-rose-500/40 ring-1 ring-rose-500/20'
                        : 'bg-slate-950/55 border-slate-900 hover:border-slate-800 hover:bg-slate-950/80'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="flex items-center space-x-2">
                        <ShoppingCart className={`h-4 w-4 ${activeFailure === 'cart_rate_limit' ? 'text-rose-400' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-white">Cart Rate Limit (429)</span>
                      </div>
                      <input
                        type="radio"
                        checked={activeFailure === 'cart_rate_limit'}
                        readOnly
                        className="accent-rose-500 h-3.5 w-3.5 cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Exceeds redis-cart connection limits. Inventory confirmation blocks with a 429 status response.
                    </p>
                  </button>
                </div>
              </div>

              {/* Guide Checklist Box */}
              <div className="mt-8 pt-6 border-t border-slate-900">
                <h4 className="text-xs font-display uppercase tracking-wider font-bold text-slate-300 mb-3 flex items-center">
                  <Sparkles className="h-4 w-4 text-indigo-400 mr-1.5" />
                  Testing Instruction Flow
                </h4>
                <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside leading-relaxed pl-1">
                  <li>Select a failure scenario above (e.g., <strong className="text-slate-300">Payment DB Timeout</strong>).</li>
                  <li>Go back to the <strong className="text-slate-300">🛍️ Storefront Portal</strong>, populate your cart, and head to checkout.</li>
                  <li>Submit checkout by clicking <strong className="text-slate-300">Place Order</strong> to run the live transaction simulator.</li>
                  <li>Switch over to the <strong className="text-slate-300">⚙️ DevOps Dashboard</strong> to examine the health cards, topology arrows, and active propagation blast-radius highlighting in red.</li>
                  <li>Use the <strong className="text-slate-300">AI Diagnosis Chat</strong> to receive full automated analysis on root causes.</li>
                </ol>
              </div>
            </div>

            {/* AI Documentation Agent Card */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-6" id="devtools-docs-card">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-900 mb-6">
                <div className="p-2.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-display uppercase tracking-wider font-semibold text-slate-200">
                    AI API Documentation Agent
                  </h2>
                  <p className="text-xs text-slate-400">
                    Generate structured, interactive REST API references dynamically via the Gemini 3.5 Documentation Agent
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
                <div className="flex flex-col space-y-1">
                  <label className="text-[11px] font-display uppercase tracking-wider font-bold text-slate-400">
                    Select Microservice Target
                  </label>
                  <select
                    value={selectedDocsService}
                    onChange={(e) => setSelectedDocsService(e.target.value as any)}
                    className="bg-slate-900 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Auth">🔑 Authentication Service (Auth)</option>
                    <option value="Cart">🛒 Cart &amp; Reservation Service (Cart)</option>
                    <option value="Payment">💳 Merchant Gateway Service (Payment)</option>
                    <option value="Order">📦 Order Fulfillment Service (Order)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleGenerateDocs}
                    disabled={isGeneratingDocs}
                    className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md"
                  >
                    {isGeneratingDocs ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Generating Reference...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Generate Docs</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Docs Presentation Area */}
              {docsError && (
                <div className="p-4 bg-rose-950/20 border border-rose-900/40 text-rose-300 rounded-xl text-xs mb-6 flex items-start space-x-2">
                  <span className="text-rose-400">🚨</span>
                  <div>
                    <p className="font-semibold">Generation Failed</p>
                    <p className="opacity-90 mt-0.5">{docsError}</p>
                  </div>
                </div>
              )}

              <div className="border border-slate-900 rounded-xl bg-slate-950/80 overflow-hidden">
                <div className="bg-slate-900/60 px-4 py-2.5 border-b border-slate-900 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="text-xs font-mono text-slate-300">
                      API_REFERENCE_{selectedDocsService.toUpperCase()}.md
                    </span>
                  </div>
                  {generatedDocs[selectedDocsService] && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedDocs[selectedDocsService]);
                        setCopiedService(selectedDocsService);
                        setTimeout(() => setCopiedService(null), 2000);
                      }}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded transition-colors font-medium cursor-pointer"
                    >
                      {copiedService === selectedDocsService ? "✓ Copied!" : "Copy Markdown"}
                    </button>
                  )}
                </div>

                <div className="p-6 max-h-[500px] overflow-y-auto font-sans leading-relaxed text-slate-300 select-text">
                  {isGeneratingDocs ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
                      <div className="text-center">
                        <p className="text-xs font-semibold text-slate-200">Documentation Agent is compiling...</p>
                        <p className="text-[10px] text-slate-400 mt-1">Analyzing schemas, responses, parameters, and generating Markdown documentation</p>
                      </div>
                    </div>
                  ) : generatedDocs[selectedDocsService] ? (
                    <div 
                      className="markdown-body space-y-2 text-xs"
                      dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(generatedDocs[selectedDocsService]) }}
                    />
                  ) : (
                    <div className="py-20 text-center flex flex-col items-center justify-center space-y-2">
                      <FileText className="h-10 w-10 text-slate-700" />
                      <div>
                        <p className="text-xs font-medium text-slate-400">No Documentation Generated Yet</p>
                        <p className="text-[10px] text-slate-500 mt-1">Select the microservice target above and click "Generate Docs" to activate the agent.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* AI Test-Generator Agent Card */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-6" id="devtools-tests-card">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-900 mb-6">
                <div className="p-2.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                  <Code2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-display uppercase tracking-wider font-semibold text-slate-200">
                    AI Test-Generator Agent
                  </h2>
                  <p className="text-xs text-slate-400">
                    Generate dynamic JSON-schema test cases covering successful states and edge-case exceptions
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
                <div className="flex flex-col space-y-1">
                  <label className="text-[11px] font-display uppercase tracking-wider font-bold text-slate-400">
                    Select Microservice Target
                  </label>
                  <select
                    value={selectedTestService}
                    onChange={(e) => setSelectedTestService(e.target.value as any)}
                    className="bg-slate-900 text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Auth">🔑 Authentication Service (Auth)</option>
                    <option value="Cart">🛒 Cart &amp; Reservation Service (Cart)</option>
                    <option value="Payment">💳 Merchant Gateway Service (Payment)</option>
                    <option value="Order">📦 Order Fulfillment Service (Order)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleGenerateTests}
                    disabled={isGeneratingTests}
                    className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md"
                  >
                    {isGeneratingTests ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Generating Suite...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Generate Tests</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {testsError && (
                <div className="p-4 bg-rose-950/20 border border-rose-900/40 text-rose-300 rounded-xl text-xs mb-6 flex items-start space-x-2">
                  <span className="text-rose-400">🚨</span>
                  <div>
                    <p className="font-semibold">Generation Failed</p>
                    <p className="opacity-90 mt-0.5">{testsError}</p>
                  </div>
                </div>
              )}

              {/* Test Cases Presentation */}
              <div className="border border-slate-900 rounded-xl bg-slate-950/80 overflow-hidden">
                <div className="bg-slate-900/60 px-4 py-2.5 border-b border-slate-900 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="text-xs font-mono text-slate-300">
                      API_TESTS_{selectedTestService.toUpperCase()}.json
                    </span>
                  </div>
                  {generatedTests[selectedTestService] && (
                    <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-900 px-2.5 py-0.5 rounded font-mono font-semibold">
                      {generatedTests[selectedTestService].length} tests ready
                    </span>
                  )}
                </div>

                <div className="p-4 max-h-[500px] overflow-y-auto">
                  {isGeneratingTests ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin text-indigo-400" />
                      <div className="text-center">
                        <p className="text-xs font-semibold text-slate-200">Test-Generator Agent is synthesizing...</p>
                        <p className="text-[10px] text-slate-400 mt-1">Modeling successful flows, invalid parameter states, and server failures...</p>
                      </div>
                    </div>
                  ) : generatedTests[selectedTestService] ? (
                    <div className="space-y-3">
                      {generatedTests[selectedTestService].map((test, idx) => {
                        const expandKey = `${selectedTestService}-${idx}`;
                        const isExpanded = !!expandedTests[expandKey];
                        const hasBody = test.body && Object.keys(test.body).length > 0;
                        const hasHeaders = test.headers && Object.keys(test.headers).length > 0;

                        return (
                          <div key={idx} className="bg-slate-900/30 border border-slate-900/80 rounded-lg overflow-hidden transition-all hover:border-slate-800">
                            <div 
                              onClick={() => toggleTestExpand(expandKey)}
                              className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer select-none bg-slate-900/10 hover:bg-slate-900/40"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase ${
                                    test.method.toUpperCase() === 'POST' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  }`}>
                                    {test.method}
                                  </span>
                                  <h4 className="text-xs font-bold text-slate-200 truncate">{test.name}</h4>
                                </div>
                                <p className="text-[10px] text-slate-500 font-mono mt-1 truncate">{test.url}</p>
                              </div>

                              <div className="flex items-center space-x-3 flex-shrink-0">
                                <div className="flex flex-col items-end">
                                  <span className="text-[8px] text-slate-500 font-mono uppercase">Exp Status</span>
                                  <span className={`text-xs font-mono font-bold ${
                                    test.expectedStatus >= 500
                                      ? 'text-rose-400'
                                      : test.expectedStatus >= 400
                                      ? 'text-amber-400'
                                      : 'text-emerald-400'
                                  }`}>
                                    HTTP {test.expectedStatus}
                                  </span>
                                </div>
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                              </div>
                            </div>

                            {/* Collapsible area with test headers and payload */}
                            {isExpanded && (
                              <div className="p-4 bg-slate-950/60 border-t border-slate-900/50 space-y-3 font-mono text-[10px]">
                                {hasHeaders && (
                                  <div>
                                    <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block mb-1">Request Headers:</span>
                                    <pre className="p-2.5 bg-slate-950 border border-slate-900 text-slate-300 rounded overflow-x-auto">
                                      {JSON.stringify(test.headers, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                
                                {hasBody ? (
                                  <div>
                                    <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block mb-1">Request Payload (Body):</span>
                                    <pre className="p-2.5 bg-slate-950 border border-slate-900 text-slate-300 rounded overflow-x-auto">
                                      {JSON.stringify(test.body, null, 2)}
                                    </pre>
                                  </div>
                                ) : (
                                  <div className="text-[9px] text-slate-500 italic">
                                    No request body payload.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-20 text-center flex flex-col items-center justify-center space-y-2">
                      <Code2 className="h-10 w-10 text-slate-700" />
                      <div>
                        <p className="text-xs font-medium text-slate-400">No Test Cases Generated Yet</p>
                        <p className="text-[10px] text-slate-500 mt-1">Select the microservice target above and click "Generate Tests" to activate the agent.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Lab footer copyright and credits */}
      <footer className="max-w-7xl mx-auto py-8 px-6 text-center text-xs text-slate-600 border-t border-slate-900 mt-12">
        <p>© 2026 API Intelligence OS — Microservice Lab Prototype.</p>
        <p className="mt-1 text-[10px] text-slate-500">
          Runs entirely in-memory for testing purposes. RCA Agent utilizes a full-stack proxy through server-side Gemini 3.5 Flash modeling.
        </p>
      </footer>
    </div>
  );
}
