import React from 'react';

const KEYWORDS = new Set([
  'public',
  'private',
  'static',
  'void',
  'int',
  'decimal',
  'string',
  'bool',
  'var',
  'if',
  'else',
  'try',
  'catch',
  'finally',
  'return',
  'throw',
  'new',
  'true',
  'false',
  'null',
]);

const EXCEPTION_TYPES = new Set([
  'Exception',
  'FormatException',
  'DivideByZeroException',
  'NullReferenceException',
  'IndexOutOfRangeException',
  'InvalidOperationException',
  'TimeoutException',
  'ArgumentNullException',
]);

export const CSharpLineSyntax: React.FC<{ code: string }> = ({ code }) => {
  // Если вся строка — комментарий
  const trimmed = code.trimStart();
  if (trimmed.startsWith('//')) {
    const leadingSpaces = code.slice(0, code.length - trimmed.length);
    return (
      <span>
        {leadingSpaces}
        <span className="cs-tok-comment">{trimmed}</span>
      </span>
    );
  }

  // Отделим хвостовой комментарий // ...
  let mainCode = code;
  let commentPart = '';
  const commentIdx = code.indexOf('//');
  if (commentIdx >= 0) {
    mainCode = code.slice(0, commentIdx);
    commentPart = code.slice(commentIdx);
  }

  // Токенизация строк, слов, чисел и операторов
  const tokenRegex = /(".*?"|\b[A-Za-z_][A-Za-z0-9_]*\b|\b\d+(?:\.\d+)?m?\b|[{}();.,=<>!+-/*]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(mainCode)) !== null) {
    if (match.index > lastIndex) {
      parts.push(mainCode.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.startsWith('"')) {
      parts.push(
        <span key={key} className="cs-tok-string">
          {token}
        </span>
      );
    } else if (KEYWORDS.has(token)) {
      parts.push(
        <span key={key} className="cs-tok-kw">
          {token}
        </span>
      );
    } else if (EXCEPTION_TYPES.has(token)) {
      parts.push(
        <span key={key} className="cs-tok-exc">
          {token}
        </span>
      );
    } else if (/^\d/.test(token)) {
      parts.push(
        <span key={key} className="cs-tok-num">
          {token}
        </span>
      );
    } else if (/^[A-Z]/.test(token)) {
      parts.push(
        <span key={key} className="cs-tok-type">
          {token}
        </span>
      );
    } else {
      parts.push(<span key={key}>{token}</span>);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < mainCode.length) {
    parts.push(mainCode.slice(lastIndex));
  }

  return (
    <span>
      {parts}
      {commentPart && <span className="cs-tok-comment">{commentPart}</span>}
    </span>
  );
};
