import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import React from 'react';
import { Product } from '@/lib/types';
import ProductModal from './product-modal';
import { getFromPrice } from '@/lib/utils';

type PropTypes = { product: Product };

const ProductCard = ({ product }: PropTypes) => {
    return (
        <Card className="border-none rounded-xl">
            <CardHeader className="flex items-center justify-center">
                {/* <Image alt="pizza-image" width={150} height={150} src={product.image} /> */}
                <Image alt="pizza-image" width={150} height={150} src="https://i.pinimg.com/1200x/12/92/bb/1292bb24e2cc03ccca20dd3cfedb6396.jpg" />
            </CardHeader>
            <CardContent>
                <h2 className="text-xl font-bold">{product.name}</h2>
                <p className="mt-2">{product.description}</p>
            </CardContent>
            <CardFooter className="flex items-center justify-between mt-4">
                <p>
                    <span>From </span>
                    <span className="font-bold">₹{getFromPrice(product)}</span>
                </p>

                <ProductModal product={product} />
            </CardFooter>
        </Card>
    );
};

export default ProductCard;
