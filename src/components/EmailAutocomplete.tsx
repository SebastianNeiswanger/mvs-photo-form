import React, { useState, useEffect, useRef } from 'react';
import { CSVData } from '../types';

interface EmailAutocompleteProps {
  csvData: CSVData | null;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  validationError?: boolean;
  ddGlow?: boolean;
}

export const EmailAutocomplete: React.FC<EmailAutocompleteProps> = ({
  csvData,
  value,
  onChange,
  className = '',
  validationError = false,
  ddGlow = false,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [allEmails, setAllEmails] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Extract unique emails from CSV data
  useEffect(() => {
    if (csvData && csvData.players) {
      const uniqueEmails = new Set(
        csvData.players
          .map(player => player.email)
          .filter(email => email && email.trim() !== '')
      );
      setAllEmails(Array.from(uniqueEmails).sort());
    }
  }, [csvData]);

  // Filter suggestions based on input
  useEffect(() => {
    if (value.trim() === '') {
      setSuggestions([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
      return;
    }

    const filtered = allEmails.filter(email =>
      email.toLowerCase().includes(value.toLowerCase())
    );

    setSuggestions(filtered.slice(0, 8)); // Limit to 8 suggestions
    setShowDropdown(filtered.length > 0);
    setSelectedIndex(-1);
  }, [value, allEmails]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectEmail(suggestions[selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectEmail = (email: string) => {
    onChange(email);
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleFocus = () => {
    if (value.trim() !== '' && suggestions.length > 0) {
      setShowDropdown(true);
    }
  };

  const computedClassName = `${className} ${validationError ? 'validation-error' : ''} ${ddGlow ? 'dd-selected-glow' : ''}`.trim();

  return (
    <div className="email-autocomplete-container">
      <input
        ref={inputRef}
        type="email"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        className={computedClassName}
        placeholder="player@example.com"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      {showDropdown && suggestions.length > 0 && (
        <div ref={dropdownRef} className="email-suggestions-dropdown">
          {suggestions.map((email, index) => (
            <div
              key={email}
              className={`email-suggestion-item ${index === selectedIndex ? 'active' : ''}`}
              onClick={() => selectEmail(email)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {email}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
