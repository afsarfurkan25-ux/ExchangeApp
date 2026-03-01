import { useContext } from 'react';
import { ExchangeContext } from '../context/ExchangeContext';

export const useExchange = () => {
    const context = useContext(ExchangeContext);
    if (!context) {
        throw new Error('useExchange must be used within an ExchangeProvider');
    }
    return context;
};
