import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError, combineLatest, BehaviorSubject, Subject, merge, from } from 'rxjs';
import { catchError, tap, map,  scan, shareReplay, mergeMap, toArray, filter, switchMap } from 'rxjs/operators';

import { Product } from './product';
import { Supplier } from '../suppliers/supplier';
import { SupplierService } from '../suppliers/supplier.service';
import { ProductCategoryService } from '../product-categories/product-category.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private productsUrl = 'api/products';
  private suppliersUrl = this.supplierService.suppliersUrl;

  constructor(private http: HttpClient, private productCategoryService: ProductCategoryService,
              private supplierService: SupplierService) { }


  products$ = this.http.get<Product[]>(this.productsUrl)
  .pipe(
    //map(item => item.price * 1.5),
    //map(products =>
      // products.map(product => ({
       // ...product,
        //price: product.price * 1.5,
        //searchkKey: [product.productName]
      // }) as Product)
    //),
    tap(data => console.log('Products: ', JSON.stringify(data))),
    catchError(this.handleError)
  );



  productsWithCategory$ = combineLatest([
    this.products$,
    this.productCategoryService.productCategories$
  ]).pipe(
    map(([products, categories]) =>
     products.map(product => ({
        ...product,
        price: product.price * 1.5,
        category: categories.find(c => product.categoryId === c.id).name,
        searchkKey: [product.productName]
     }) as Product)
     ),
     shareReplay(1)
  );

private productSelectedSubject = new BehaviorSubject<number>(0);
productSelectedAction$ = this.productSelectedSubject.asObservable();

selectedProduct$ = combineLatest([
  this.productsWithCategory$,
  this.productSelectedAction$
])
  .pipe(
    map(([products, selectedProductId]) =>
       products.find(product => product.id === selectedProductId)
    ),
    tap(product => console.log('selectedProduct', product)),
    shareReplay(1)
  );

  selectedProductChanged(selectedProductId: number): void {
    this.productSelectedSubject.next(selectedProductId);
  }

  // tslint:disable: member-ordering
  private productInsertedSubject = new Subject<Product>();
  productInsertedAction$ = this.productInsertedSubject.asObservable();


  productsWithAdd$ = merge(
    this.productsWithCategory$,
    this.productInsertedAction$
  ).pipe(
    scan((acc: Product[], value: Product) => [...acc, value])
  );

  addProduct(newProduct?: Product){
    newProduct = newProduct || this.fakeProduct();
    this.productInsertedSubject.next(newProduct);
  }

  // Get It All Approach
  /* selectedProductSuppliers$ = combineLatest([
    this.selectedProduct$,
    this.supplierService.supplier$
  ]).pipe(
    map(([selectedProduct, suppliers]) =>
    suppliers.filter(supplier => selectedProduct.supplierIds.includes(supplier.id))
    )
  ); */

  // Just In Time Approach
  selectedProductSuppliers$ = this.selectedProduct$
  .pipe(
    filter(selectedProduct => Boolean(selectedProduct)), // Check for Null
    switchMap(selectedProduct =>
        from(selectedProduct.supplierIds) // Create a Stream
        .pipe(
          mergeMap(supplierId => this.http.get<Supplier>(`${this.suppliersUrl}/${supplierId}`)),
          toArray()
        )
      )
  )



  private fakeProduct() {
    return {
      id: 42,
      productName: 'Another One',
      productCode: 'TBX-0042',
      description: 'Our new product',
      price: 8.9,
      categoryId: 3,
      category: 'Toolbox',
      quantityInStock: 30
    };
  }

  private handleError(err: any) {
    // in a real world app, we may send the server to some remote logging infrastructure
    // instead of just logging it to the console
    let errorMessage: string;
    if (err.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      errorMessage = `An error occurred: ${err.error.message}`;
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      errorMessage = `Backend returned code ${err.status}: ${err.body.error}`;
    }
    console.error(err);
    return throwError(errorMessage);
  }

}
