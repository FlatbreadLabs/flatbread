/**
 * GraphQL query panel with syntax highlighting and clean presentation
 */

'use client';

import { useState } from 'react';

interface QueryPanelProps {
  query: string;
  data: unknown;
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
      className="px-3 py-1 text-xs font-bold tracking-wide text-white uppercase transition-colors bg-black hover:bg-gray-800"
      title={`Copy ${label}`}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function SyntaxHighlight({ code, language }: { code: string; language: 'graphql' | 'json' }) {
  // Escape HTML entities to prevent unintended HTML injection from code strings
  const escapeHTML = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Simple syntax highlighting for GraphQL and JSON
  const highlightGraphQL = (str: string) => {
    // Order matters – highlight string literals first so later replacements don't target attributes we inject.
    return str
      .replace(/"([^\"]*)"/g, '<span class="text-amber-600">"$1"</span>')
      .replace(/\b(query|mutation|subscription|fragment)\b/g, '<span class="font-bold text-purple-600">$1</span>')
      .replace(/\b(type|interface|enum|union|scalar|input)\b/g, '<span class="font-bold text-blue-600">$1</span>')
      .replace(/\b(String|Int|Float|Boolean|ID)\b/g, '<span class="font-semibold text-green-600">$1</span>')
      .replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '<span class="text-red-600">$1</span>:');
  };

  const highlightJSON = (str: string) => {
    return str
      .replace(/"([^"]+)":/g, '<span class="text-blue-600">"$1"</span>:')
      .replace(/:\s*"([^"]*)"/g, ': <span class="text-green-600">"$1"</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="text-purple-600">$1</span>')
      .replace(/:\s*(\d+)/g, ': <span class="text-red-600">$1</span>');
  };

  const sanitizedCode = escapeHTML(code);
  const highlighted = language === 'graphql' ? highlightGraphQL(sanitizedCode) : highlightJSON(sanitizedCode);

  return (
    <div 
      className="font-mono text-sm leading-relaxed whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

export default function QueryPanel({ query, data }: QueryPanelProps) {
  const [activeTab, setActiveTab] = useState<'query' | 'response'>('query');
  
  const formattedData = JSON.stringify(data, null, 2);

  return (
    <div className="sticky top-0 flex flex-col h-screen col-span-4 bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b-2 border-black">
        <h2 className="text-lg font-bold tracking-wider uppercase">
          GraphQL
        </h2>
        <p className="mt-1 font-mono text-xs text-gray-600">
          Real-time query inspection
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b-2 border-black">
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
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
              <span className="font-mono text-xs text-gray-600">
                GET_POST_CATEGORIES
              </span>
              <CopyButton text={query} label="query" />
            </div>
            <div className="flex-1 p-4 overflow-auto bg-white">
              <SyntaxHighlight code={query} language="graphql" />
            </div>
          </div>
        )}

        {activeTab === 'response' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
              <span className="font-mono text-xs text-gray-600">
                {((data as { allPostCategories?: unknown[] })?.allPostCategories?.length ?? 0)} posts
              </span>
              <CopyButton text={formattedData} label="response" />
            </div>
            <div className="flex-1 p-4 overflow-auto bg-gray-50">
              <SyntaxHighlight code={formattedData} language="json" />
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 text-white bg-black border-t-2 border-black">
        <div className="space-y-2">
          <div className="flex justify-between font-mono text-xs">
            <span>Endpoint:</span>
            <span>localhost:5057/graphql</span>
          </div>
          <div className="flex justify-between font-mono text-xs">
            <span>Status:</span>
            <span className="text-green-400">● Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}