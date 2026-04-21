'use client';
import { setInitialCartItems } from '@/lib/store/features/cart/cartSlice';
import { AppStore, makeStore } from '@/lib/store/store';
import { useRef } from 'react';
import { Provider } from 'react-redux';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
    const storeRef = useRef<AppStore>();
    if (!storeRef.current) {
        storeRef.current = makeStore();
        const isLocalStorageAvailable = typeof window !== 'undefined' && window.localStorage;
        if (isLocalStorageAvailable) {
            const cartItems = window.localStorage.getItem('cartItems');

            try {
                const parsedItems = JSON.parse(cartItems as string);
                storeRef.current.dispatch(setInitialCartItems(parsedItems));
            } catch (err) {
                console.error(err);
            }
        }
    }

    return <Provider store={storeRef.current}>{children}</Provider>;
}
