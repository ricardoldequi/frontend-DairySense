import { useState, useRef, useEffect } from 'react';
import { MdExpandMore } from 'react-icons/md';
import './CustomSelect.css';

function CustomSelect({ 
  id, 
  name, 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Selecione...', 
  required = false,
  disabled = false,
  label = '',
  hint = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => String(opt.value) === String(value));
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setSearchTerm('');
    }
  };

  const handleSelect = (optionValue) => {
    onChange({ target: { name, value: optionValue } });
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="custom-select-wrapper" ref={dropdownRef}>
      {label && (
        <label htmlFor={id} className="custom-select-label">
          {label} {required && '*'}
          {hint && <span className="custom-select-hint">{hint}</span>}
        </label>
      )}
      
      <div 
        className={`custom-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={handleToggle}
      >
        <input
          type="hidden"
          id={id}
          name={name}
          value={value}
          required={required}
        />
        <div className="custom-select-display">
          <span className={!selectedOption ? 'placeholder' : ''}>
            {displayText}
          </span>
          <MdExpandMore className="custom-select-arrow" />
        </div>
      </div>

      {isOpen && (
        <div className="custom-select-dropdown">
          <div className="custom-select-search">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="custom-select-options">
            {filteredOptions.length === 0 ? (
              <div className="custom-select-option empty">
                Nenhuma opção encontrada
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`custom-select-option ${String(option.value) === String(value) ? 'selected' : ''}`}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomSelect;