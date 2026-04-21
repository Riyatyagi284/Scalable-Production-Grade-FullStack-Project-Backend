import React from 'react';
import { CartItem } from '../store/features/cart/cartSlice';
import { getItemTotal } from '../utils';

export function useTotal(product: CartItem) {
    const totalPrice = React.useMemo(() => {
        return getItemTotal(product);
    }, [product]);
    return totalPrice;
}
