// src/components/VocabBookSelector.jsx
import { useState } from 'react';

export const VocabBookSelector = ({ books, currentBook, onSelect, onClose }) => {
  const [selecting, setSelecting] = useState(null);

  const handleSelect = (bookId) => {
    setSelecting(bookId);
    onSelect(bookId);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card" style={{ maxWidth: 380, margin: '0 auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--warm-700)', margin: 0 }}>📚 选择你的词书</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-light)', padding: 4 }}>✕</button>
        </div>
        {books.map(book => (
          <div
            key={book.id}
            className={`book-item ${currentBook?.id === book.id ? 'active' : ''}`}
            onClick={() => handleSelect(book.id)}
            style={{ opacity: selecting === book.id ? 0.7 : 1 }}
          >
            <span className="book-emoji">{book.cover_emoji}</span>
            <div className="book-info" style={{ flex: 1 }}>
              <div className="book-name">{book.name}</div>
              <div className="book-desc">{book.description}</div>
            </div>
            <div className="book-count">
              {currentBook?.id === book.id && <span style={{ marginRight: 4 }}>✓</span>}
              {book.word_count} 词
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
