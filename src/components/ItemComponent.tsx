import React from 'react';
import { ItemConfig } from '../types';

interface ItemComponentProps {
  item: ItemConfig;
  quantity: number;
  onQuantityChange: (itemCode: string, quantity: number) => void;
  onIncrement: (itemCode: string) => void;
  onDecrement: (itemCode: string) => void;
}

export const ItemComponent: React.FC<ItemComponentProps> = ({
  item,
  quantity,
  onQuantityChange,
  onIncrement,
  onDecrement
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    onQuantityChange(item.code, value);
  };

  const handleItemClick = () => {
    onIncrement(item.code);
  };

  return (
    <div 
      className={`item-component ${quantity > 0 ? 'has-quantity' : ''}`}
      onClick={handleItemClick}
    >
      <div className="item-info">
        <div className="item-display-name">{item.displayName}</div>
        <div className="item-code">{item.code}</div>
        <div className="item-price">${item.price}</div>
      </div>
      
      <div className="quantity-controls">
        <button
          className="quantity-btn decrement"
          onClick={(e) => {
            e.stopPropagation();
            onDecrement(item.code);
          }}
          disabled={quantity <= 0}
          type="button"
        >
          -
        </button>
        
        <input
          type="number"
          className="quantity-input"
          value={quantity}
          onChange={(e) => {
            e.stopPropagation();
            handleInputChange(e);
          }}
          onClick={(e) => e.stopPropagation()}
          min="0"
        />
        
        <button
          className="quantity-btn increment"
          onClick={(e) => {
            e.stopPropagation();
            onIncrement(item.code);
          }}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
};