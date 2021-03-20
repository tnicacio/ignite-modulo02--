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
      const productAlreadyOnCart = cart.find( (product: Product) => (product.id === productId));
      const stock = (await api.get<Stock>(`stock/${productId}`))?.data;
      const currentAmount = productAlreadyOnCart ? productAlreadyOnCart.amount : 0;
      const hasStock = stock && stock.amount > currentAmount;

      if (!hasStock){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productAlreadyOnCart) {
        updateProductAmount( { productId, amount: currentAmount + 1} );
      } else {

        const newProduct = (await api.get<Product>(`products/${productId}`))?.data;
        if (newProduct) {
          const newProductWithInitialAmount = {
            ...newProduct,
            amount: 1,
          }
          const updatedCart = [...cart, newProductWithInitialAmount];
          setCart(updatedCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        }  
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {

      const copyCart = [...cart];
      const productIndex = copyCart.findIndex( (product:Product) => product.id === productId);

      if (productIndex === -1) {
        throw Error();
      }

      const newCartWithoutTheProduct = copyCart.filter( (product: Product) => product.id !== productId );
      setCart(newCartWithoutTheProduct);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCartWithoutTheProduct));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount <= 0) {
        return;
      }

      const stock = (await api.get<Stock>(`stock/${productId}`))?.data;
      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map((productOnCart: Product) => {
        if (productOnCart.id === productId){
          return {...productOnCart, amount: amount};
        }
        return {...productOnCart};
      });
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
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
