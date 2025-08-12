import React from 'react';
import { PACKAGE_ITEMS } from '../config';
import { OrderQuantities } from '../types';

interface PackageGridProps {
  quantities: OrderQuantities;
  onQuantityChange: (itemCode: string, quantity: number) => void;
  onIncrement: (itemCode: string) => void;
  onDecrement: (itemCode: string) => void;
}

export const PackageGrid: React.FC<PackageGridProps> = ({
  quantities,
  onQuantityChange,
  onIncrement,
  onDecrement
}) => {
  // const handlePackageClick = (itemCode: string) => {
  //   const currentQuantity = quantities[itemCode] || 0;
  //   onQuantityChange(itemCode, currentQuantity + 1);
  // };

  const handleInputChange = (itemCode: string, value: string) => {
    const quantity = parseInt(value) || 0;
    onQuantityChange(itemCode, quantity);
  };

  return (
    <div className="package-grid">
      {PACKAGE_ITEMS.map((item) => {
        const quantity = quantities[item.code] || 0;
        return (
          <div
            key={item.code}
            className={`package-item ${quantity > 0 ? 'selected' : ''}`}
          >
            <div className="item-code">{item.code}</div>
            <div className="item-price">${item.price}</div>
            
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
                  handleInputChange(item.code, e.target.value);
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
      })}
    </div>
  );
};