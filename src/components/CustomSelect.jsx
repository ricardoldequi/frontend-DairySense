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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);
  const selectRef = useRef(null);

  const selectedOption = options.find(opt => String(opt.value) === String(value));
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // calcula posição do dropdown
  useEffect(() => {
    if (isOpen && selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  // fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          selectRef.current && !selectRef.current.contains(event.target)) {
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

  // reposiciona dropdown ao redimensionar janela
  useEffect(() => {
    const handleResize = () => {
      if (isOpen && selectRef.current) {
        const rect = selectRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width
        });
      }
    };

    if (isOpen) {
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize, true);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
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
    <>
      <div className="custom-select-wrapper">
        {label && (
          <label htmlFor={id} className="custom-select-label">
            {label} {required && '*'}
            {hint && <span className="custom-select-hint">{hint}</span>}
          </label>
        )}
        
        <div 
          ref={selectRef}
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
      </div>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className="custom-select-dropdown"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
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
    </>
  );
}

export default CustomSelect;