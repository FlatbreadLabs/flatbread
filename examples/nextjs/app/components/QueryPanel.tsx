/**
 * GraphQL query panel with syntax highlighting and clean presentation
 */

'use client';

import { useState } from 'react';

interface QueryPanelProps {
  query: string;
  data: any;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1 text-xs font-bold uppercase tracking-wide bg-black text-white hover:bg-gray-800 transition-colors"
      title={`Copy ${label}`}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function SyntaxHighlight({ code, language }: { code: string; language: 'graphql' | 'json' }) {
  // Simple syntax highlighting for GraphQL and JSON
  const highlightGraphQL = (str: string) => {
    return str
      .replace(/\b(query|mutation|subscription|fragment)\b/g, '<span class="text-purple-600 font-bold">$1</span>')
      .replace(/\b(type|interface|enum|union|scalar|input)\b/g, '<span class="text-blue-600 font-bold">$1</span>')
      .replace(/\b(String|Int|Float|Boolean|ID)\b/g, '<span class="text-green-600 font-semibold">$1</span>')
      .replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '<span class="text-red-600">$1</span>:')
      .replace(/"([^"]*)"/g, '<span class="text-amber-600">"$1"</span>');
  };

  const highlightJSON = (str: string) => {
    return str
      .replace(/"([^"]+)":/g, '<span class="text-blue-600">"$1"</span>:')
      .replace(/:\s*"([^"]*)"/g, ': <span class="text-green-600">"$1"</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="text-purple-600">$1</span>')
      .replace(/:\s*(\d+)/g, ': <span class="text-red-600">$1</span>');
  };

  const highlighted = language === 'graphql' ? highlightGraphQL(code) : highlightJSON(code);

  return (
    <div 
      className="whitespace-pre-wrap font-mono text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

export default function QueryPanel({ query, data }: QueryPanelProps) {
  const [activeTab, setActiveTab] = useState<'query' | 'response'>('query');
  
  const formattedData = JSON.stringify(data, null, 2);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b-2 border-black p-4 bg-white">
        <h2 className="text-lg font-bold uppercase tracking-wider">
          GraphQL
        </h2>
        <p className="text-xs text-gray-600 mt-1 font-mono">
          Real-time query inspection
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b-2 border-black bg-white">
        <div className="flex">
          <button
            onClick={() => setActiveTab('query')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors border-r border-gray-300 ${
              activeTab === 'query'
                ? 'bg-black text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Query
          </button>
          <button
            onClick={() => setActiveTab('response')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
              activeTab === 'response'
                ? 'bg-black text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Response
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'query' && (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
              <span className="text-xs font-mono text-gray-600">
                GET_POST_CATEGORIES
              </span>
              <CopyButton text={query} label="query" />
            </div>
            <div className="flex-1 overflow-auto p-4 bg-white">
              <SyntaxHighlight code={query} language="graphql" />
            </div>
          </div>
        )}

        {activeTab === 'response' && (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
              <span className="text-xs font-mono text-gray-600">
                {data.allPostCategories?.length || 0} posts
              </span>
              <CopyButton text={formattedData} label="response" />
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              <SyntaxHighlight code={formattedData} language="json" />
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t-2 border-black p-4 bg-black text-white">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span>Endpoint:</span>
            <span>localhost:5057/graphql</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span>Status:</span>
            <span className="text-green-400">● Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}