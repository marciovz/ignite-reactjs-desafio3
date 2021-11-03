import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

     if (storagedCart) {
       return JSON.parse(storagedCart);
     }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockProduct = await api.get(`/stock/${productId}`);
      let newProduct = cart.filter(product => product.id === productId)[0];
      const othersProducts = cart.filter(product => product.id !== productId);

      if(!stockProduct) throw new Error('productId not found!');
      
      const stockAmount = stockProduct.data.amount;
      const currentAmount = newProduct ? newProduct.amount : 0;
      
      if (currentAmount >= stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (newProduct)  {
        ++newProduct.amount;
      }else{
        const response = await api(`/products/${productId}`);
        newProduct = {
          ...response.data,
          amount: 1
        }
      }

      const newListProducts = [...othersProducts, newProduct];
      setCart(newListProducts);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newListProducts));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const targetProduct = cart.filter(product => product.id === productId);
      
      if (targetProduct.length <= 0) throw Error();
      
      const othersProducts = cart.filter(product => product.id !== productId);
      setCart(othersProducts);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(othersProducts));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stockProduct = await api.get(`/stock/${productId}`);
      if(!stockProduct) throw new Error('productId not found!');
      const stockAmount = stockProduct.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      let targetProduct = cart.filter(product => product.id === productId)[0];   
      const othersProducts = cart.filter(product => product.id !== productId);

      if (!targetProduct) throw Error();

      targetProduct.amount = amount;

      const newListProducts = [...othersProducts, targetProduct];
      setCart(newListProducts);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newListProducts));

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
