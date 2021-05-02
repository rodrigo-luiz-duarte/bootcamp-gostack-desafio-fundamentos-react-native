import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useEffect,
} from 'react';

import AsyncStorage from '@react-native-community/async-storage';

export interface Product {
  id: string;
  title: string;
  image_url: string;
  price: number;
  quantity: number;
}

interface CartContext {
  products: Product[];
  addToCart(item: Omit<Product, 'quantity'>): void;
  increment(id: string): void;
  decrement(id: string): void;
}

const CartContext = createContext<CartContext | null>(null);

const CartProvider: React.FC = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);

  async function loadProducts(): Promise<void> {
    const productKeys = await AsyncStorage.getAllKeys();

    if (productKeys && productKeys.length > 0) {
      const productList = await AsyncStorage.multiGet(productKeys);

      if (productList && productList.length > 0) {
        const newProductList: Product[] = productList.map(product => {
          if (product != null) {
            return JSON.parse(product[1] || '{}');
          }

          return null;
        });

        newProductList.sort((a, b) => {
          if (a.title < b.title) {
            return -1;
          }
          if (a.title > b.title) {
            return 1;
          }
          return 0;
        });

        setProducts(newProductList);

        return;
      }
    }

    setProducts([]);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function getProductFromCartById(id: string): Promise<Product | null> {
    const productInTheCar = await AsyncStorage.getItem(id);

    if (productInTheCar) {
      return JSON.parse(productInTheCar);
    }

    return null;
  }

  const refreshProductInList = useCallback(
    (product: Product) => {
      const indexOfProduct = products.findIndex(p => p.id === product.id);

      const newProductList = [...products];

      if (indexOfProduct >= 0) {
        newProductList.splice(indexOfProduct, 1);
      }

      newProductList.push(product);

      newProductList.sort((a, b) => {
        if (a.title < b.title) {
          return -1;
        }
        if (a.title > b.title) {
          return 1;
        }
        return 0;
      });

      setProducts(newProductList);
    },
    [products],
  );

  const addToCart = useCallback(
    async product => {
      let p: Product | null = await getProductFromCartById(product.id);

      if (p) {
        p.quantity += 1;
        await AsyncStorage.mergeItem(p.id, JSON.stringify(p));
        refreshProductInList(p);
      } else {
        p = product as Product;
        p.quantity = 1;
        await AsyncStorage.setItem(p.id, JSON.stringify(p));
        refreshProductInList(p);
      }
    },
    [refreshProductInList],
  );

  const increment = useCallback(
    async id => {
      const p: Product | null = await getProductFromCartById(id);

      if (p) {
        p.quantity += 1;
        await AsyncStorage.mergeItem(p.id, JSON.stringify(p));
        refreshProductInList(p);
      }
    },
    [refreshProductInList],
  );

  const decrement = useCallback(
    async id => {
      const p: Product | null = await getProductFromCartById(id);

      if (p) {
        if (p.quantity > 1) {
          p.quantity -= 1;
          await AsyncStorage.mergeItem(p.id, JSON.stringify(p));
          refreshProductInList(p);
        }
      }
    },
    [refreshProductInList],
  );

  const value = React.useMemo(
    () => ({ addToCart, increment, decrement, products }),
    [products, addToCart, increment, decrement],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

function useCart(): CartContext {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(`useCart must be used within a CartProvider`);
  }

  return context;
}

export { CartProvider, useCart };
