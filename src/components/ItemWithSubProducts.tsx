import React, { useState } from 'react';
import { ItemConfig, OrderQuantities } from '../types';
import { ItemComponent } from './ItemComponent';

interface ItemWithSubProductsProps {
  item: ItemConfig;
  subProducts: ItemConfig[];
  quantities: OrderQuantities;
  onQuantityChange: (itemCode: string, quantity: number) => void;
  onIncrement: (itemCode: string) => void;
  onDecrement: (itemCode: string) => void;
}

export const ItemWithSubProducts: React.FC<ItemWithSubProductsProps> = ({
  item,
  subProducts,
  quantities,
  onQuantityChange,
  onIncrement,
  onDecrement
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubProducts = subProducts.length > 0;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="item-with-subproducts">
      <div className="parent-item-wrapper">
        {hasSubProducts && (
          <button
            className="chevron-button"
            onClick={toggleExpand}
            type="button"
          >
            <span className={`chevron ${isExpanded ? 'expanded' : 'collapsed'}`}>
              {isExpanded ? '▼' : '▶'}
            </span>
          </button>
        )}
        <div className="parent-item-content">
          <ItemComponent
            item={item}
            quantity={quantities[item.code] || 0}
            onQuantityChange={onQuantityChange}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
          />
        </div>
      </div>

      {hasSubProducts && isExpanded && (
        <div className="sub-products-container">
          {subProducts.map((subItem) => (
            <div key={subItem.code} className="sub-product-item">
              <ItemComponent
                item={subItem}
                quantity={quantities[subItem.code] || 0}
                onQuantityChange={onQuantityChange}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
