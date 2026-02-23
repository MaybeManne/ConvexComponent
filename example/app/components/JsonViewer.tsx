"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface JsonViewerProps {
  data: unknown;
}

export function JsonViewer({ data }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="
          absolute top-2 right-2 p-2
          bg-neutral-800 border border-neutral-700
          hover:bg-neutral-700 hover:border-neutral-600
          rounded-md opacity-0 group-hover:opacity-100
          transition-all z-10
        "
        title="Copy JSON"
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <Copy className="w-4 h-4 text-neutral-400" />
        )}
      </button>

      <pre className="p-4 bg-neutral-800 border border-neutral-700 rounded-lg overflow-x-auto text-sm">
        <code>
          <JsonSyntaxHighlight json={jsonString} />
        </code>
      </pre>
    </div>
  );
}

function JsonSyntaxHighlight({ json }: { json: string }) {
  // Simple syntax highlighting for JSON
  const highlighted = json
    // Strings (keys and values)
    .replace(
      /"([^"\\]|\\.)*"/g,
      (match) => {
        // Check if this is a key (followed by :)
        const isKey = json.indexOf(match + ":") !== -1 || json.indexOf(match + " :") !== -1;
        if (isKey) {
          return `<span class="json-key">${match}</span>`;
        }
        return `<span class="json-string">${match}</span>`;
      }
    )
    // Numbers
    .replace(
      /\b(\d+\.?\d*)\b/g,
      '<span class="json-number">$1</span>'
    )
    // Booleans
    .replace(
      /\b(true|false)\b/g,
      '<span class="json-boolean">$1</span>'
    )
    // Null
    .replace(
      /\bnull\b/g,
      '<span class="json-null">null</span>'
    );

  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
}
